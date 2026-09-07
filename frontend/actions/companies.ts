'use server';

import { prisma } from '../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';
import { parse } from 'csv-parse/sync';

export async function getCompanies(filters?: { search?: string, status?: string, industry?: string, page?: number, limit?: number }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const { search, status, industry, page = 1, limit = 1000 } = filters || {};

  const where: any = {};
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { contactPerson: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (status) where.status = status;
  if (industry) where.industry = industry;

  const total = await prisma.company.count({ where });
  const companies = await prisma.company.findMany({
    where,
    include: {
      assignment: {
        include: { user: { select: { id: true, name: true, email: true } } }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });

  return { data: companies, pagination: { totalPages: Math.ceil(total / limit) } };
}

export async function getCompanyById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      assignment: {
        include: { user: { select: { id: true, name: true, email: true } } }
      },
      notes: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' }
      },
      emails: {
        orderBy: { createdAt: 'desc' }
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } }
      }
    }
  });

  return company;
}

export async function deleteCompany(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') throw new Error('Unauthorized');
  
  // Perform manual cascade deletions since the schema is missing some onDelete: Cascade rules
  await prisma.reply.deleteMany({ where: { companyId: id } });
  await prisma.email.deleteMany({ where: { companyId: id } });
  await prisma.note.deleteMany({ where: { companyId: id } });
  await prisma.activity.deleteMany({ where: { companyId: id } });
  await prisma.followUp.deleteMany({ where: { companyId: id } });
  await prisma.notification.deleteMany({ where: { companyId: id } });
  await prisma.assignment.deleteMany({ where: { companyId: id } });

  await prisma.company.delete({ where: { id } });
  return { success: true };
}

export async function importCompanies(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') throw new Error('Unauthorized');

  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  const fileContent = await file.text();
  if (!fileContent.trim()) throw new Error('CSV file is empty');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) throw new Error('No records found in CSV');

  let successCount = 0;
  for (const record of records as any[]) {
    if (!record.companyName) continue;
    try {
      await prisma.company.create({
        data: {
          companyName: record.companyName,
          contactPerson: record.contactPerson || null,
          designation: record.designation || null,
          email: record.email || null,
          website: record.website || null,
          industry: record.industry || null,
          linkedin: record.linkedin || null,
          phoneNumber: record.phoneNumber || null,
          location: record.location || null,
        }
      });
      successCount++;
    } catch (e) {
      console.error('Error importing row', record.companyName, e);
    }
  }

  return { success: true, count: successCount };
}
export async function getTemplates() { const session = await getServerSession(authOptions); if (!session?.user) throw new Error('Unauthorized'); return await prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } }); }

export async function createCompany(data: {
  companyName: string;
  contactPerson?: string;
  email?: string;
  website?: string;
  industry?: string;
  location?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  
  const company = await prisma.company.create({
    data
  });
  return company;
}


export async function updateCompanySummary(id: string, summary: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  
  await prisma.company.update({
    where: { id },
    data: { aiSummary: summary }
  });
  return { success: true };
}
