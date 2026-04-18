import { createHash, randomUUID, timingSafeEqual } from "crypto";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { Types } from "mongoose";
import AppError from "../../../errors/AppError";
import config from "../../../config";
import { afterSuccessLogin } from "../../../utils/afterSuccessLogin";
import type { ActiveRole, IUser } from "./user.interface";
import { User } from "./user.model";
import { Admin } from "../admin/admin.model";
import { Image } from "../../media/image.model";
import { LoginSession } from "../loginSession/loginSession.model";
import {
  LoginSessionService,
  type LoginSessionClientMeta,
} from "../loginSession/loginSession.service";
import { generateOTP, sendEmail } from "../../../utils/sendEmail";
import { signSessionManagementToken } from "../../../utils/sessionManagementToken";

type CreateUserBody = Pick<IUser, "name" | "age" | "phone" | "email" | "password"> & {
  activeRole?: ActiveRole;
  roles?: ActiveRole[];
};

const sha256Equal = (a: string, b: string): boolean => {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return ha.length === hb.length && timingSafeEqual(ha, hb);
};

const assertSuperAdminProfile = async (userId: Types.ObjectId) => {
  const superAdmin = await Admin.findOne({
    userId,
    role: "SUPER_ADMIN",
    isDeleted: false,
    isActive: true,
  }).lean();
  return Boolean(superAdmin);
};

const anySuperAdminExists = () =>
  Admin.exists({ role: "SUPER_ADMIN", isDeleted: false });

const findUserByEmailCaseInsensitive = (normalizedEmail: string) =>
  User.findOne({
    $expr: { $eq: [{ $toLower: "$email" }, normalizedEmail] },
  }).select("+password");

/**
 * Creates verified ADMIN user (if missing), placeholder images, and SUPER_ADMIN admin row. Safe under concurrent first logins.
 * If the email already exists, the password must match that user (bcrypt) and the user must not already have a non-super Admin profile.
 */
const bootstrapSuperAdminFromEnv = async (
  emailNorm: string,
  plainPassword: string,
): Promise<void> => {
  let user = await findUserByEmailCaseInsensitive(emailNorm);

  if (user) {
    if (!user.isVerified || user.status !== "ACTIVE") {
      throw new AppError(
        "Super admin bootstrap email is registered but the account is not verified or active",
        httpStatus.CONFLICT,
      );
    }
    const existingSuper = await Admin.findOne({
      userId: user._id,
      role: "SUPER_ADMIN",
      isDeleted: false,
    }).lean();
    if (existingSuper) {
      return;
    }
    const otherAdmin = await Admin.findOne({ userId: user._id, isDeleted: false }).lean();
    if (otherAdmin) {
      throw new AppError(
        "Super admin bootstrap email is already linked to a non-super-admin account",
        httpStatus.CONFLICT,
      );
    }
    const pwOk = await bcrypt.compare(plainPassword, user.password);
    if (!pwOk) {
      throw new AppError(
        "Super admin bootstrap email is already registered with a different password",
        httpStatus.CONFLICT,
      );
    }
  } else {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const phone = `+1999${Date.now()}${randomUUID().replace(/-/g, "").slice(0, 8)}`;
      try {
        await User.create({
          name: "Super Admin",
          age: 1,
          phone,
          email: emailNorm,
          password: plainPassword,
          activeRole: "ADMIN",
          roles: ["ADMIN"],
          status: "ACTIVE",
          isVerified: true,
        });
        break;
      } catch (err: unknown) {
        const code = (err as { code?: number })?.code;
        if (code === 11000) {
          user = await findUserByEmailCaseInsensitive(emailNorm);
          if (user) {
            break;
          }
          continue;
        }
        throw err;
      }
    }
    user = await findUserByEmailCaseInsensitive(emailNorm);
  }

  if (!user) {
    throw new AppError("Super admin bootstrap failed", httpStatus.INTERNAL_SERVER_ERROR);
  }

  const existingSuper = await Admin.findOne({
    userId: user._id,
    role: "SUPER_ADMIN",
    isDeleted: false,
  }).lean();
  if (existingSuper) {
    return;
  }

  const otherAdmin = await Admin.findOne({ userId: user._id, isDeleted: false }).lean();
  if (otherAdmin) {
    throw new AppError(
      "Super admin bootstrap email is already linked to a non-super-admin account",
      httpStatus.CONFLICT,
    );
  }

  const imgProfile = await Image.create({
    size: 0,
    name: "bootstrap-super-admin-profile",
    url: "about:blank",
    r2_key: `system/bootstrap/profile/${randomUUID()}`,
    userId: user._id,
  });
  const imgNid = await Image.create({
    size: 0,
    name: "bootstrap-super-admin-nid",
    url: "about:blank",
    r2_key: `system/bootstrap/nid/${randomUUID()}`,
    userId: user._id,
  });

  try {
    await Admin.create({
      userId: user._id,
      role: "SUPER_ADMIN",
      profileImage: imgProfile._id,
      nid: imgNid._id,
      designation: "Super Admin",
      permissions: [],
      joinDate: new Date(),
      isActive: true,
      isDeleted: false,
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code !== 11000) {
      throw err;
    }
  }
};

const createUserIntoDB = async (payload: CreateUserBody) => {
  // business rule: email and phone must be unique
  const exists = await User.findOne({
    $or: [{ email: payload.email }, { phone: payload.phone }],
  });
  if (exists) {
    throw new AppError("Email or phone already exists", httpStatus.CONFLICT);
  }

  const activeRole = (payload.activeRole ?? "IMPORTER") as ActiveRole;
  let roles: ActiveRole[] =
    payload.roles && payload.roles.length > 0
      ? [...payload.roles]
      : [activeRole];
  if (!roles.includes(activeRole)) {
    roles = [...roles, activeRole];
  }

  const otp = generateOTP();

  const user = await User.create({
    name: payload.name,
    age: payload.age,
    phone: payload.phone,
    email: payload.email,
    password: payload.password,
    activeRole: payload.activeRole ?? "IMPORTER",
    roles: payload.roles ?? ["IMPORTER"],
    status: "ACTIVE",
    otp,
    isVerified: false,
  });

  const userObj = user.toObject();
  if ("password" in userObj) {
    delete (userObj as Partial<typeof userObj>).password;
  }
  await sendEmail(
    user.email,
    "Welcome to our platform",
    `Welcome to our platform ${user.email} and your OTP is ${otp}`,
  );
  return "user created successfully and OTP sent to email";
};

const verifyOtp = async (email: string, otp: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("User not found", httpStatus.NOT_FOUND);
  }

  if (user.otp !== otp) {
    throw new AppError("Invalid OTP", httpStatus.BAD_REQUEST);
  }

  user.isVerified = true;
  user.otp = undefined as any;

  await user.save();

  return afterSuccessLogin(user);
};

const loginUser = async (
  email: string,
  password: string,
  sessionMeta: LoginSessionClientMeta,
) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password", httpStatus.UNAUTHORIZED);
  }
  if (!user.isVerified) {
    throw new AppError(
      "Please verify your account before logging in",
      httpStatus.FORBIDDEN,
    );
  }
  if (user.status !== "ACTIVE") {
    throw new AppError("Account is not active", httpStatus.FORBIDDEN);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AppError("Invalid email or password", httpStatus.UNAUTHORIZED);
  }

  const session = await LoginSessionService.createLoginSession(
    user._id,
    sessionMeta,
  );

  const userObj = user.toObject();
  delete (userObj as { password?: string }).password;
  delete (userObj as { otp?: string }).otp;

  const tokens = afterSuccessLogin(user, session.sessionId);
  return { ...tokens, user: userObj, session };
};

const switchRole = async (
  userId: string,
  email: string,
  currentRole: ActiveRole,
  loginSessionId?: string,
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", httpStatus.NOT_FOUND);
  }
  if (user.status !== "ACTIVE") {
    throw new AppError("Account is not active", httpStatus.FORBIDDEN);
  }
  if (!user.isVerified) {
    throw new AppError("Account is not verified", httpStatus.FORBIDDEN);
  }
  if (user.email !== email) {
    throw new AppError("Unauthorized", httpStatus.UNAUTHORIZED);
  }
  if (user.activeRole !== currentRole) {
    throw new AppError("Invalid or outdated token", httpStatus.UNAUTHORIZED);
  }
  if (user.activeRole !== "IMPORTER" && user.activeRole !== "EXPORTER") {
    throw new AppError("Role switch is only available for importer/exporter users", httpStatus.BAD_REQUEST);
  }

  const nextRole: Extract<ActiveRole, "IMPORTER" | "EXPORTER"> =
    user.activeRole === "IMPORTER" ? "EXPORTER" : "IMPORTER";

  user.activeRole = nextRole;
  if (!user.roles.includes(nextRole)) {
    user.roles = [...user.roles, nextRole];
  }
  await user.save();

  const userObj = user.toObject();
  delete (userObj as { password?: string }).password;
  delete (userObj as { otp?: string }).otp;

  const tokens = afterSuccessLogin(user, loginSessionId, nextRole);
  return {
    ...tokens,
    user: userObj,
    ...(loginSessionId ? { session: { sessionId: loginSessionId } } : {}),
  };
};

const invalidSuperAdminCreds = () =>
  new AppError("Invalid super admin credentials", httpStatus.UNAUTHORIZED);

/**
 * Super admin: verified ACTIVE user + Admin `role: SUPER_ADMIN`.
 * If none exists yet, `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` + matching body create User + Admin (bootstrap).
 */
const loginSuperAdmin = async (email: string, password: string) => {
  const deny = invalidSuperAdminCreds;

  const envEmail = config.super_admin_email;
  const envPass = config.super_admin_password;
  const emailNorm = email.trim().toLowerCase();
  const envConfigured = Boolean(envEmail && envPass);

  if (envConfigured) {
    const envMatches =
      sha256Equal(emailNorm, envEmail.toLowerCase()) &&
      sha256Equal(password, envPass);

    if (!(await anySuperAdminExists())) {
      if (!envMatches) {
        throw deny();
      }
      await bootstrapSuperAdminFromEnv(envEmail.trim().toLowerCase(), password);

      const bootUser = await findUserByEmailCaseInsensitive(emailNorm);
      if (!bootUser?.isVerified || bootUser.status !== "ACTIVE") {
        throw deny();
      }
      if (!(await assertSuperAdminProfile(bootUser._id))) {
        throw deny();
      }
      if (!(await bcrypt.compare(password, bootUser.password))) {
        throw deny();
      }
      return {
        ...afterSuccessLogin(bootUser, undefined, "ADMIN"),
        tier: "SUPER_ADMIN" as const,
      };
    }
  }

  const user = await findUserByEmailCaseInsensitive(emailNorm);
  if (!user) {
    throw deny();
  }
  if (!user.isVerified || user.status !== "ACTIVE") {
    throw deny();
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw deny();
  }
  if (!(await assertSuperAdminProfile(user._id))) {
    throw deny();
  }

  return {
    ...afterSuccessLogin(user, undefined, "ADMIN"),
    tier: "SUPER_ADMIN" as const,
  };
};

const logoutUser = async (
  userId: string,
  deviceId: string,
  loginSessionIdFromToken: string | undefined,
): Promise<void> => {
  if (!loginSessionIdFromToken || !Types.ObjectId.isValid(loginSessionIdFromToken)) {
    throw new AppError(
      "Use an access token from email/password login. Tokens from verify-otp only cannot use this logout.",
      httpStatus.BAD_REQUEST,
    );
  }
  const oid = new Types.ObjectId(userId);
  const current = await LoginSession.findOne({
    _id: new Types.ObjectId(loginSessionIdFromToken),
    userId: oid,
  })
    .select("deviceId")
    .lean();
  if (!current) {
    throw new AppError("Session not found", httpStatus.NOT_FOUND);
  }
  if (current.deviceId !== deviceId.trim()) {
    throw new AppError(
      "deviceId does not match the session for this token",
      httpStatus.FORBIDDEN,
    );
  }
  await LoginSessionService.deleteSessionsForUserByDeviceId(userId, deviceId);
};

const SESSION_MGMT_OTP_TTL_MS = 10 * 60 * 1000;

const requestSessionManagementOtp = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("User not found", httpStatus.NOT_FOUND);
  }
  if (!user.isVerified) {
    throw new AppError("Account is not verified", httpStatus.FORBIDDEN);
  }
  if (user.status !== "ACTIVE") {
    throw new AppError("Account is not active", httpStatus.FORBIDDEN);
  }

  const otp = generateOTP();
  user.sessionMgmtOtp = otp;
  user.sessionMgmtOtpExpiresAt = new Date(Date.now() + SESSION_MGMT_OTP_TTL_MS);
  await user.save();

  await sendEmail(
    user.email,
    "Manage your login sessions",
    `<p>Your session management OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
  );

  return { sent: true as const };
};

const verifySessionManagementOtpAndListSessions = async (email: string, otp: string) => {
  const user = await User.findOne({ email }).select(
    "+sessionMgmtOtp +sessionMgmtOtpExpiresAt",
  );
  if (!user) {
    throw new AppError("User not found", httpStatus.NOT_FOUND);
  }

  if (!user.sessionMgmtOtp || user.sessionMgmtOtp !== otp) {
    throw new AppError("Invalid OTP", httpStatus.BAD_REQUEST);
  }
  if (!user.sessionMgmtOtpExpiresAt || user.sessionMgmtOtpExpiresAt < new Date()) {
    throw new AppError("OTP has expired", httpStatus.BAD_REQUEST);
  }

  await User.updateOne(
    { _id: user._id },
    { $unset: { sessionMgmtOtp: 1, sessionMgmtOtpExpiresAt: 1 } },
  );

  const sessions = await LoginSessionService.listSessionsForUser(user._id);
  const sessionManagementToken = signSessionManagementToken(String(user._id), user.email);

  return { sessions, sessionManagementToken };
};

const deleteSessionByManagementFlow = async (userId: string, sessionId: string) => {
  await LoginSessionService.deleteSessionForUser(userId, sessionId);
};

const listSessionsForManagementFlow = async (userId: string) => {
  return LoginSessionService.listSessionsForUser(userId);
};

const PASSWORD_RESET_OTP_TTL_MS = 15 * 60 * 1000;

const requestPasswordResetOtp = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user || user.status !== "ACTIVE") {
    return { sent: true as const };
  }

  const otp = generateOTP();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetOtp: otp,
        passwordResetOtpExpiresAt: new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS),
      },
    },
  );

  await sendEmail(
    user.email,
    "Reset your password",
    `<p>Your password reset OTP is <strong>${otp}</strong>. It expires in 15 minutes.</p>`,
  );

  return { sent: true as const };
};

const resetPasswordWithOtp = async (email: string, otp: string, newPassword: string) => {
  const user = await User.findOne({ email }).select(
    "+password +passwordResetOtp +passwordResetOtpExpiresAt",
  );

  if (!user || user.status !== "ACTIVE") {
    throw new AppError("Invalid or expired OTP", httpStatus.BAD_REQUEST);
  }
  if (!user.passwordResetOtp || user.passwordResetOtp !== otp) {
    throw new AppError("Invalid or expired OTP", httpStatus.BAD_REQUEST);
  }
  if (!user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt < new Date()) {
    throw new AppError("Invalid or expired OTP", httpStatus.BAD_REQUEST);
  }

  user.password = newPassword;
  await user.save();

  await User.updateOne(
    { _id: user._id },
    { $unset: { passwordResetOtp: 1, passwordResetOtpExpiresAt: 1 } },
  );

  await LoginSessionService.deleteAllSessionsForUser(user._id);

  return { reset: true as const };
};

const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await User.findById(userId).select("+password");
  if (!user || user.status !== "ACTIVE") {
    throw new AppError("User not found", httpStatus.NOT_FOUND);
  }

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    throw new AppError("Current password is incorrect", httpStatus.UNAUTHORIZED);
  }

  user.password = newPassword;
  await user.save();

  await LoginSessionService.deleteAllSessionsForUser(user._id);

  return { changed: true as const };
};

const softDeleteAccount = async (userId: string, password: string) => {
  const user = await User.findById(userId).select("+password");
  if (!user || user.status !== "ACTIVE") {
    throw new AppError("User not found", httpStatus.NOT_FOUND);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AppError("Invalid password", httpStatus.UNAUTHORIZED);
  }

  user.status = "DELETED";
  user.deletedAt = new Date();
  await user.save();

  await LoginSessionService.deleteAllSessionsForUser(user._id);

  return { deleted: true as const };
};

type UpdateProfilePayload = {
  name?: string;
  phone?: string;
  age?: number;
  activeRole?: Extract<ActiveRole, "IMPORTER" | "EXPORTER">;
};

const toPublicUser = (user: { toObject: () => Record<string, unknown> }) => {
  const userObj = user.toObject();
  delete (userObj as { password?: string }).password;
  delete (userObj as { otp?: string }).otp;
  return userObj;
};

const getProfileFromDB = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    throw new AppError("User not found", httpStatus.NOT_FOUND);
  }
  return toPublicUser(user);
};

const updateProfileIntoDB = async (userId: string, payload: UpdateProfilePayload) => {
  const user = await User.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    throw new AppError("User not found", httpStatus.NOT_FOUND);
  }

  if (payload.name !== undefined) {
    user.name = payload.name.trim();
  }

  if (payload.phone !== undefined && payload.phone.trim() !== user.phone) {
    const taken = await User.findOne({
      phone: payload.phone.trim(),
      _id: { $ne: user._id },
    });
    if (taken) {
      throw new AppError("Phone already in use", httpStatus.CONFLICT);
    }
    user.phone = payload.phone.trim();
  }

  if (payload.age !== undefined) {
    user.age = payload.age;
  }

  if (payload.activeRole !== undefined) {
    user.activeRole = payload.activeRole;
    if (!user.roles.includes(payload.activeRole)) {
      user.roles = [...user.roles, payload.activeRole];
    }
  }

  await user.save();

  return toPublicUser(user);
};

export const UserService = {
  createUserIntoDB,
  verifyOtp,
  loginUser,
  switchRole,
  loginSuperAdmin,
  logoutUser,
  requestSessionManagementOtp,
  verifySessionManagementOtpAndListSessions,
  deleteSessionByManagementFlow,
  listSessionsForManagementFlow,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  changePassword,
  softDeleteAccount,
  getProfileFromDB,
  updateProfileIntoDB,
};
