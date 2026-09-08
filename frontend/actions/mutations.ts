'use server';

import { prisma } from '../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

// --- ADMIN ASSIGNMENT ---

export async function assignCompanyToMember(companyId: string, targetUserId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') throw new Error('Unauthorized');
  
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error('Company not found');

  // If removing assignment
  if (!targetUserId) {
    await prisma.assignment.deleteMany({ where: { companyId } });
    if (company.status === 'ASSIGNED') {
      await prisma.company.update({ where: { id: companyId }, data: { status: 'NOT_ASSIGNED', lockedById: null, lockedAt: null } });
    }
    return { success: true };
  }

  // If assigning to a specific member
  await prisma.assignment.upsert({
    where: { companyId },
    update: { userId: targetUserId },
    create: { companyId, userId: targetUserId }
  });

  if (company.status === 'NOT_ASSIGNED') {
    await prisma.company.update({ where: { id: companyId }, data: { status: 'ASSIGNED', lockedById: null, lockedAt: null } });
  }

  return { success: true };
}

// --- LOCKING MUTATIONS ---

export async function lockCompany(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { assignment: true }
  });

  if (!company) throw new Error('Company not found');

  if (company.status !== 'NOT_ASSIGNED') {
    if (company.assignment?.userId !== userId && userRole !== 'ADMIN') {
      throw new Error('Forbidden: Assigned to another member.');
    }
  }

  if (company.status === 'EMAIL_SENT' || company.status === 'CONFIRMED') {
     throw new Error('Company is already contacted.');
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const result = await prisma.company.updateMany({
    where: {
      id: companyId,
      OR: [
        { lockedById: null },
        { lockedById: userId },
        { lockedAt: { lt: fiveMinutesAgo } }
      ]
    },
    data: {
      lockedById: userId,
      lockedAt: new Date()
    }
  });

  if (result.count === 0) {
    throw new Error('This company is currently locked by another member who is drafting an email.');
  }

  // If the company is completely unassigned, instantly assign it to the member who acquired the lock!
  if (company.status === 'NOT_ASSIGNED') {
    await prisma.assignment.upsert({
      where: { companyId },
      update: { userId },
      create: { companyId, userId }
    });
    await prisma.company.update({
      where: { id: companyId },
      data: { status: 'ASSIGNED' }
    });
  }

  return { success: true };
}

export async function unlockCompany(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { assignment: true }
  });

  if (!company) throw new Error("Company not found");

  if (userRole !== 'ADMIN' && company.lockedById !== userId) {
    throw new Error('Unauthorized to unlock this company');
  }

  const isJustAssigned = company.status === 'ASSIGNED';

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: companyId },
      data: {
        lockedById: null,
        lockedAt: null,
        ...(isJustAssigned ? { status: 'NOT_ASSIGNED' } : {})
      }
    });

    if (isJustAssigned && company.assignment) {
      await tx.assignment.delete({ where: { companyId } });
    }
  });

  return { success: true };
}

// --- NOTES ---

export async function addNote(companyId: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const userId = (session.user as any).id;

  if (!content.trim()) throw new Error('Content is required');

  const note = await prisma.note.create({
    data: { content, companyId, authorId: userId },
    include: { author: { select: { id: true, name: true } } }
  });

  await prisma.activity.create({
    data: { companyId, type: 'NOTE_ADDED', description: 'Added a note', userId }
  });

  return { success: true, note };
}

// --- STATUS UPDATES ---

export async function updateCompanyStatus(companyId: string, status: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const userId = (session.user as any).id;

  await prisma.company.update({
    where: { id: companyId },
    data: { status: status as any } // Enum casting
  });

  await prisma.activity.create({
    data: { companyId, type: 'STATUS_CHANGED', description: `Status changed to ${status}`, userId }
  });

  return { success: true };
}
export async function scheduleFollowUp(companyId: string, date: string, note?: string) { const session = await getServerSession(authOptions); if (!session?.user) throw new Error('Unauthorized'); const userId = (session.user as any).id; const parsedDate = new Date(date); await prisma.followUp.create({ data: { companyId, userId, date: parsedDate, note: note || '' } }); await prisma.company.update({ where: { id: companyId }, data: { followUpDate: parsedDate } }); await prisma.activity.create({ data: { companyId, type: 'FOLLOW_UP_SCHEDULED', description: 'Follow-up scheduled', userId } }); return { success: true }; }

export async function getNotifications() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return [];
  const userId = (session.user as any).id;
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
}

export async function markAllNotificationsRead() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return;
  const userId = (session.user as any).id;
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true }
  });
}

export async function markNotificationRead(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return;
  const userId = (session.user as any).id;
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true }
  });
}

// --- BULK ACTIONS ---

export async function bulkChangeStatus(companyIds: string[], status: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') throw new Error('Unauthorized');
  
  await prisma.company.updateMany({
    where: { id: { in: companyIds } },
    data: { status }
  });
  return { success: true };
}

export async function bulkAssignCompanies(companyIds: string[], userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') throw new Error('Unauthorized');
  
  for (const id of companyIds) {
    await prisma.assignment.upsert({
      where: { companyId: id },
      update: { userId },
      create: { companyId: id, userId }
    });
    
    // Auto-update status to ASSIGNED if they were NOT_ASSIGNED
    const company = await prisma.company.findUnique({ where: { id } });
    if (company?.status === 'NOT_ASSIGNED') {
      await prisma.company.update({
        where: { id },
        data: { status: 'ASSIGNED' }
      });
    }
  }
  
  return { success: true };
}

