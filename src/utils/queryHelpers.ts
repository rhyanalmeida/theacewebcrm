import { Request } from 'express';
import { FilterQuery, PaginationQuery } from '../types';

/**
 * Parse pagination parameters from request query
 */
export const parsePagination = (query: PaginationQuery) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
  const skip = (page - 1) * limit;
  const sort = query.sort || 'createdAt';
  const order = query.order === 'asc' ? 1 : -1;

  return {
    page,
    limit,
    skip,
    sort: { [sort]: order }
  };
};

/**
 * Build search query with filters
 */
export const buildSearchQuery = (filters: FilterQuery, baseQuery: any = {}) => {
  const query = { ...baseQuery };

  // Text search
  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { company: searchRegex },
      { name: searchRegex },
      { title: searchRegex }
    ];
  }

  // Status filter
  if (filters.status) {
    query.status = filters.status;
  }

  // Role filter
  if (filters.role) {
    query.role = filters.role;
  }

  // Owner filter
  if (filters.owner) {
    query.owner = filters.owner;
  }

  // Created by filter
  if (filters.createdBy) {
    query.createdBy = filters.createdBy;
  }

  // Tags filter
  if (filters.tags) {
    const tags = filters.tags.split(',').map(tag => tag.trim().toLowerCase());
    query.tags = { $in: tags };
  }

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) {
      query.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.createdAt.$lte = new Date(filters.dateTo);
    }
  }

  return query;
};

/**
 * Create pagination metadata
 */
export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

/**
 * Apply population to query based on entity type
 */
export const applyPopulation = (query: any, entityType: string) => {
  const populationMap: Record<string, string> = {
    contact: 'owner createdBy updatedBy',
    lead: 'owner createdBy updatedBy convertedTo',
    deal: 'contact company owner createdBy updatedBy',
    company: 'owner createdBy updatedBy',
    project: 'client manager assignedUsers createdBy updatedBy'
  };

  const fieldsToPopulate = populationMap[entityType];
  if (fieldsToPopulate) {
    return query.populate(fieldsToPopulate, 'firstName lastName email name');
  }

  return query;
};

/**
 * Build aggregation pipeline for statistics
 */
export const buildStatsAggregation = (matchQuery: any = {}) => {
  return [
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        totalValue: { $sum: '$value' },
        avgValue: { $avg: '$value' },
        maxValue: { $max: '$value' },
        minValue: { $min: '$value' }
      }
    }
  ];
};

/**
 * Build aggregation pipeline for status distribution
 */
export const buildStatusDistribution = (matchQuery: any = {}) => {
  return [
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: { $ifNull: ['$value', 0] } }
      }
    },
    { $sort: { count: -1 } }
  ];
};

/**
 * Build aggregation pipeline for time-based analytics
 */
export const buildTimeSeriesAggregation = (
  matchQuery: any = {},
  dateField: string = 'createdAt',
  groupBy: 'day' | 'week' | 'month' = 'day'
) => {
  let dateFormat: string;
  switch (groupBy) {
    case 'week':
      dateFormat = '%Y-W%U';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
    default:
      dateFormat = '%Y-%m-%d';
  }

  return [
    { $match: matchQuery },
    {
      $group: {
        _id: {
          $dateToString: {
            format: dateFormat,
            date: `$${dateField}`
          }
        },
        count: { $sum: 1 },
        totalValue: { $sum: { $ifNull: ['$value', 0] } }
      }
    },
    { $sort: { '_id': 1 } }
  ];
};

/**
 * Sanitize sort field to prevent injection
 */
export const sanitizeSortField = (sortField: string, allowedFields: string[]): string => {
  const cleanField = sortField.replace(/[^a-zA-Z0-9._-]/g, '');
  return allowedFields.includes(cleanField) ? cleanField : 'createdAt';
};

/**
 * Build text search query
 */
export const buildTextSearchQuery = (searchTerm: string, fields: string[]) => {
  const searchRegex = new RegExp(searchTerm, 'i');
  return {
    $or: fields.map(field => ({ [field]: searchRegex }))
  };
};

/**
 * Apply role-based filtering
 */
export const applyRoleBasedFiltering = (query: any, user: any) => {
  // Admin and Manager can see all records
  if (user.role === 'admin' || user.role === 'manager') {
    return query;
  }

  // Regular users can only see their own records
  return { ...query, owner: user._id };
};

/**
 * Extract filters from request query
 */
export const extractFilters = (req: Request): FilterQuery => {
  const { search, status, role, owner, createdBy, tags, dateFrom, dateTo } = req.query;
  
  return {
    search: search as string,
    status: status as string,
    role: role as string,
    owner: owner as string,
    createdBy: createdBy as string,
    tags: tags as string,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string
  };
};

/**
 * Build lookup stage for aggregation
 */
export const buildLookupStage = (
  from: string,
  localField: string,
  foreignField: string = '_id',
  as: string
) => {
  return {
    $lookup: {
      from,
      localField,
      foreignField,
      as,
      pipeline: [
        {
          $project: {
            firstName: 1,
            lastName: 1,
            email: 1,
            name: 1
          }
        }
      ]
    }
  };
};

export default {
  parsePagination,
  buildSearchQuery,
  createPaginationMeta,
  applyPopulation,
  buildStatsAggregation,
  buildStatusDistribution,
  buildTimeSeriesAggregation,
  sanitizeSortField,
  buildTextSearchQuery,
  applyRoleBasedFiltering,
  extractFilters,
  buildLookupStage
};