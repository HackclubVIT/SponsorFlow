
'use server';

import { prisma } from '../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

export async function getDashboardStats(filters: { startDate?: string, endDate?: string, userId?: string, industry?: string, status?: string }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  try {
    const { startDate, endDate, userId, industry, status } = filters;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const whereFilter: any = {};
    if (Object.keys(dateFilter).length > 0) whereFilter.createdAt = dateFilter;
    if (industry) whereFilter.industry = industry;
    if (status) whereFilter.status = status;
    
    const userRole = (session.user as any).role;
    const finalUserId = userRole === 'ADMIN' ? userId : (session.user as any).id;

    if (finalUserId) {
      whereFilter.assignment = { userId: finalUserId };
    }

    const totalCompanies = await prisma.company.count({ where: whereFilter });
    const assignedCompanies = await prisma.company.count({
      where: { ...whereFilter, status: { not: 'NOT_ASSIGNED' } }
    });

    const emailsSent = await prisma.company.count({
      where: { ...whereFilter, status: { in: ['EMAIL_SENT', 'OPENED', 'REPLIED', 'INTERESTED', 'NEGOTIATING', 'CONFIRMED', 'REJECTED'] } }
    });

    const replies = await prisma.company.count({
      where: { ...whereFilter, status: { in: ['REPLIED', 'INTERESTED', 'NEGOTIATING', 'CONFIRMED', 'REJECTED'] } }
    });

    const sponsorsConfirmed = await prisma.company.count({
      where: { ...whereFilter, status: 'CONFIRMED' }
    });

    const sumAgg = await prisma.company.aggregate({
      where: whereFilter,
      _sum: { amountRaised: true }
    });
    const totalSponsorshipRaised = sumAgg._sum.amountRaised || 0;

    const replyRate = emailsSent > 0 ? Math.round((replies / emailsSent) * 100) + '%' : '0%';

    // Industry Stats
    const industryGroups = await prisma.company.groupBy({
      by: ['industry'],
      _count: { id: true },
      where: whereFilter
    });
    const industryStats = industryGroups.map(g => ({
      industry: g.industry || 'Unknown',
      total: g._count.id
    }));

    // Member Performance
    const members = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        assignments: {
          include: { company: true }
        }
      }
    });

    const memberPerformance = members.map(m => {
      const comps = m.assignments.map(a => a.company);
      const mEmails = comps.filter(c => ['EMAIL_SENT', 'OPENED', 'REPLIED', 'INTERESTED', 'NEGOTIATING', 'CONFIRMED', 'REJECTED'].includes(c.status)).length;
      const mReplies = comps.filter(c => ['REPLIED', 'INTERESTED', 'NEGOTIATING', 'CONFIRMED', 'REJECTED'].includes(c.status)).length;
      const mConfirmed = comps.filter(c => c.status === 'CONFIRMED').length;
      const mRaised = comps.reduce((acc, c) => acc + (c.amountRaised || 0), 0);
      
      return {
        id: m.id,
        name: m.name,
        assigned: comps.length,
        emailsSent: mEmails,
        replies: mReplies,
        confirmed: mConfirmed,
        raised: mRaised
      };
    });

    // Recent Replies (top-level, separate from member loop)
    const recentReplies = await prisma.reply.findMany({
      include: {
        company: { select: { id: true, companyName: true } },
        email: { select: { sender: { select: { name: true, email: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return {
      totalCompanies,
      assignedCompanies,
      emailsSent,
      replies,
      sponsorsConfirmed,
      totalSponsorshipRaised,
      replyRate,
      industryStats,
      memberPerformance,
      recentReplies
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch analytics');
  }
}
