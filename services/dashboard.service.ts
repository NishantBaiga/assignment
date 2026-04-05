import { connectDB } from "@/lib/db/connect";
import FinancialRecord from "@/models/FinancialRecord";
import { DashboardQuery } from "@/schemas/record.schema";
import { JWTPayload } from "@/types";
import mongoose, { PipelineStage } from "mongoose";

// ---------------------------------------------------------------------------
// Helper — builds the base $match stage used across all pipelines
// ---------------------------------------------------------------------------
function buildBaseMatch(
  userId: string,
  role: string,
  query?: Partial<DashboardQuery>
): Record<string, unknown> {
  const match: Record<string, unknown> = {
    isDeleted: false,
  };

  if (role !== "admin") {
    match.userId = new mongoose.Types.ObjectId(userId);
  }

  if (query?.startDate || query?.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (query.startDate) dateFilter.$gte = query.startDate;
    if (query.endDate) dateFilter.$lte = query.endDate;
    match.date = dateFilter;
  }

  return match;
}

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------
export interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  totalRecords: number;
  incomeCount: number;
  expenseCount: number;
}

export interface CategoryTotal {
  category: string;
  type: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  year: number;
  month: number;
  monthName: string;
  income: number;
  expenses: number;
  net: number;
}

export interface RecentTransaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  date: Date;
  note: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Dashboard Service
// ---------------------------------------------------------------------------
export const dashboardService = {

  // -------------------------------------------------------------------------
  // getSummary
  // -------------------------------------------------------------------------
  async getSummary(
    user: JWTPayload,
    query: DashboardQuery
  ): Promise<SummaryData> {
    await connectDB();

    const match = buildBaseMatch(user.userId, user.role, query);

    // Explicit PipelineStage[] type annotation fixes the union inference error
    const pipeline: PipelineStage[] = [
      {
        $match: match,
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          data: {
            $push: {
              type: "$_id",
              total: "$total",
              count: "$count",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalIncome: {
            $ifNull: [
              {
                $reduce: {
                  input: {
                    $filter: {
                      input: "$data",
                      as: "d",
                      cond: { $eq: ["$$d.type", "income"] },
                    },
                  },
                  initialValue: 0,
                  in: { $add: ["$$value", "$$this.total"] },
                },
              },
              0,
            ],
          },
          totalExpenses: {
            $ifNull: [
              {
                $reduce: {
                  input: {
                    $filter: {
                      input: "$data",
                      as: "d",
                      cond: { $eq: ["$$d.type", "expense"] },
                    },
                  },
                  initialValue: 0,
                  in: { $add: ["$$value", "$$this.total"] },
                },
              },
              0,
            ],
          },
          incomeCount: {
            $ifNull: [
              {
                $reduce: {
                  input: {
                    $filter: {
                      input: "$data",
                      as: "d",
                      cond: { $eq: ["$$d.type", "income"] },
                    },
                  },
                  initialValue: 0,
                  in: { $add: ["$$value", "$$this.count"] },
                },
              },
              0,
            ],
          },
          expenseCount: {
            $ifNull: [
              {
                $reduce: {
                  input: {
                    $filter: {
                      input: "$data",
                      as: "d",
                      cond: { $eq: ["$$d.type", "expense"] },
                    },
                  },
                  initialValue: 0,
                  in: { $add: ["$$value", "$$this.count"] },
                },
              },
              0,
            ],
          },
        },
      },
    ];

    const result = await FinancialRecord.aggregate(pipeline);

    if (!result.length) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        totalRecords: 0,
        incomeCount: 0,
        expenseCount: 0,
      };
    }

    const { totalIncome, totalExpenses, incomeCount, expenseCount } = result[0];

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netBalance: Math.round((totalIncome - totalExpenses) * 100) / 100,
      totalRecords: incomeCount + expenseCount,
      incomeCount,
      expenseCount,
    };
  },

  // -------------------------------------------------------------------------
  // getCategoryTotals
  // -------------------------------------------------------------------------
  async getCategoryTotals(
    user: JWTPayload,
    query: DashboardQuery
  ): Promise<{ income: CategoryTotal[]; expense: CategoryTotal[] }> {
    await connectDB();

    const match = buildBaseMatch(user.userId, user.role, query);

    const pipeline: PipelineStage[] = [
      {
        $match: match,
      },
      {
        $group: {
          _id: { category: "$category", type: "$type" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      // ↓ Fix: use explicit 1 | -1 literal, not plain number
      {
        $sort: { total: -1 as const },
      },
      {
        $group: {
          _id: "$_id.type",
          categories: {
            $push: {
              category: "$_id.category",
              total: "$total",
              count: "$count",
            },
          },
          grandTotal: { $sum: "$total" },
        },
      },
      {
        $project: {
          _id: 0,
          type: "$_id",
          categories: {
            $map: {
              input: "$categories",
              as: "cat",
              in: {
                category: "$$cat.category",
                type: "$_id",
                total: { $round: ["$$cat.total", 2] },
                count: "$$cat.count",
                percentage: {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$$cat.total", "$grandTotal"] },
                        100,
                      ],
                    },
                    1,
                  ],
                },
              },
            },
          },
        },
      },
    ];

    const result = await FinancialRecord.aggregate(pipeline);

    const income: CategoryTotal[] = [];
    const expense: CategoryTotal[] = [];

    for (const group of result) {
      if (group.type === "income") {
        income.push(...group.categories);
      } else {
        expense.push(...group.categories);
      }
    }

    return { income, expense };
  },

  // -------------------------------------------------------------------------
  // getMonthlyTrends
  // -------------------------------------------------------------------------
  async getMonthlyTrends(
    user: JWTPayload,
    query: DashboardQuery
  ): Promise<MonthlyTrend[]> {
    await connectDB();

    const months = query.months ?? 6;
    const endDate = query.endDate ?? new Date();
    const startDate =
      query.startDate ??
      new Date(
        endDate.getFullYear(),
        endDate.getMonth() - (months - 1),
        1
      );

    const match = buildBaseMatch(user.userId, user.role, {
      startDate,
      endDate,
    });

    const pipeline: PipelineStage[] = [
      {
        $match: match,
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      {
        $group: {
          _id: {
            year: "$_id.year",
            month: "$_id.month",
          },
          income: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "income"] }, "$total", 0],
            },
          },
          expenses: {
            $sum: {
              $cond: [{ $eq: ["$_id.type", "expense"] }, "$total", 0],
            },
          },
        },
      },
      // ↓ Fix: nested sort keys need explicit 1 | -1 literals
      {
        $sort: {
          "_id.year": 1 as const,
          "_id.month": 1 as const,
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          income: { $round: ["$income", 2] },
          expenses: { $round: ["$expenses", 2] },
          net: { $round: [{ $subtract: ["$income", "$expenses"] }, 2] },
        },
      },
    ];

    const result = await FinancialRecord.aggregate(pipeline);

    const MONTH_NAMES = [
      "January", "February", "March", "April",
      "May", "June", "July", "August",
      "September", "October", "November", "December",
    ];

    return result.map((r) => ({
      ...r,
      monthName: MONTH_NAMES[r.month - 1],
    }));
  },

  // -------------------------------------------------------------------------
  // getRecentTransactions
  // -------------------------------------------------------------------------
  async getRecentTransactions(
    user: JWTPayload,
    limit = 10
  ): Promise<RecentTransaction[]> {
    await connectDB();

    const match = buildBaseMatch(user.userId, user.role);

    const pipeline: PipelineStage[] = [
      {
        $match: match,
      },
      // ↓ Fix: explicit literals
      {
        $sort: {
          date: -1 as const,
          createdAt: -1 as const,
        },
      },
      {
        $limit: Math.min(limit, 50),
      },
      {
        $project: {
          _id: 0,
          id: { $toString: "$_id" },
          amount: 1,
          type: 1,
          category: 1,
          date: 1,
          note: 1,
          createdAt: 1,
        },
      },
    ];

    return FinancialRecord.aggregate(pipeline);
  },
};