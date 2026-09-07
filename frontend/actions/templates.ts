'use server';

import { prisma } from '../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

export async function getTemplates() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') throw new Error('Unauthorized');
  return await prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createTemplate(data: { name: string, subject: string, body: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') throw new Error('Unauthorized');
  const userId = (session.user as any).id;
  
  if (!data.name || !data.subject || !data.body) throw new Error('Missing fields');
  
  return await prisma.emailTemplate.create({
    data: {
      ...data,
      createdBy: userId
    }
  });
}

export async function updateTemplate(id: string, data: { name: string, subject: string, body: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') throw new Error('Unauthorized');
  
  if (!data.name || !data.subject || !data.body) throw new Error('Missing fields');
  
  return await prisma.emailTemplate.update({
    where: { id },
    data
  });
}

export async function deleteTemplate(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') throw new Error('Unauthorized');
  
  try {
    return await prisma.emailTemplate.delete({
      where: { id }
    });
  } catch (error) {
    throw new Error('Template not found or already deleted');
  }
}
