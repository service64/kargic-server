import { Query } from 'mongoose';

type QueryParams = Record<string, unknown>;

type PaginationOptions = {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
};

const RESERVED_QUERY_KEYS = [
  'search',
  'searchTerm',
  'sort',
  'limit',
  'page',
  'fields',
] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: QueryParams;
  private currentPage = 1;
  private currentLimit = 10;

  constructor(modelQuery: Query<T[], T>, query: QueryParams) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  private asString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private asPositiveInt(value: unknown, fallback: number): number {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(1, Math.floor(num));
  }

  private withMongoOperators(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((v) => this.withMongoOperators(v));
    }

    if (!isPlainObject(value)) {
      return value;
    }

    const transformed: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value)) {
      if (['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'in', 'nin'].includes(key)) {
        transformed[`$${key}`] =
          (key === 'in' || key === 'nin') && typeof val === 'string'
            ? val.split(',').map((s) => s.trim()).filter(Boolean)
            : this.withMongoOperators(val);
      } else {
        transformed[key] = this.withMongoOperators(val);
      }
    }

    return transformed;
  }

  search(searchableFields: string[] = []) {
    const searchTerm = this.asString(this.query.searchTerm ?? this.query.search);

    if (searchTerm && searchableFields.length > 0) {
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map(
          (field) =>
            ({
              [field]: { $regex: searchTerm, $options: 'i' },
            } as Record<string, unknown>)
        ),
      });
    }

    return this;
  }

  filter(extraExcludeFields: string[] = []) {
    const queryObj: QueryParams = { ...this.query };

    const excludeFields = [...RESERVED_QUERY_KEYS, ...extraExcludeFields];

    excludeFields.forEach((el) => delete queryObj[el]);

    const mongoFilter = this.withMongoOperators(queryObj);

    this.modelQuery = this.modelQuery.find(mongoFilter as Record<string, unknown>);

    return this;
  }

  sort(defaultSort = '-createdAt') {
    const sort = this.asString(this.query.sort)?.split(',').join(' ') || defaultSort;
    this.modelQuery = this.modelQuery.sort(sort);

    return this;
  }

  paginate(options: PaginationOptions = {}) {
    const defaultPage = options.defaultPage ?? 1;
    const defaultLimit = options.defaultLimit ?? 10;
    const maxLimit = options.maxLimit ?? 100;

    const page = this.asPositiveInt(this.query.page, defaultPage);
    const limit = Math.min(this.asPositiveInt(this.query.limit, defaultLimit), maxLimit);
    const skip = (page - 1) * limit;

    this.currentPage = page;
    this.currentLimit = limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);

    return this;
  }

  fields(defaultFields = '-__v') {
    const fields = this.asString(this.query.fields)?.split(',').join(' ') || defaultFields;

    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }

  async countTotal() {
    const totalQueries = this.modelQuery.getFilter();
    const total = await this.modelQuery.model.countDocuments(totalQueries);
    const page = this.currentPage;
    const limit = this.currentLimit;
    const totalPage = Math.max(1, Math.ceil(total / limit));
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPage;

    return {
      page,
      limit,
      total,
      totalPage,
      hasNextPage,
      hasPrevPage,
    };
  }
}

export default QueryBuilder;
