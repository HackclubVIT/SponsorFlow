'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
};

async function safeGenerate(prompt: string, fallback: string): Promise<string> {
  const model = getModel();
  if (!model) return fallback;
  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('AI Generation Failed:', error);
    return fallback;
  }
}

export async function generatePersonalizedIntro(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error('Company not found');

  const prompt = `Write exactly ONE professional and highly personalized opening sentence for an email to a sponsor.
  Context:
  Company Name: ${company.companyName}
  Industry: ${company.industry || 'Unknown'}
  Website: ${company.website || 'Unknown'}
  Location: ${company.location || 'Unknown'}
  Company Description: ${company.aiSummary || 'Not provided'}
  
  The sentence should be appreciative of their work or mission based on the description, without mentioning sponsorship yet.
  Only return the single sentence, no greetings or sign-offs.`;

  const fallback = `I've been closely following the impactful work ${company.companyName} has been doing in the ${company.industry || 'tech'} space.`;
  const text = await safeGenerate(prompt, fallback);
  return { success: true, text };
}

export async function generateCompanySummary(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error('Company not found');

  const prompt = `Act as an expert corporate researcher. Create a very concise, structured summary (in markdown bullet points) about the company: ${company.companyName}.
  
  Known details:
  Industry: ${company.industry}
  Website: ${company.website}
  
  Include these exact headers:
  - **Industry Position:**
  - **Key Products/Services:**
  - **Developer Programs / APIs:** (if applicable)
  - **CSR / Initiatives:**
  - **Recent News / Activities:**
  
  Make educated guesses based on the industry and company name if they are famous, otherwise extract general patterns for a company in that sector. Keep each bullet to 1 sentence.`;

  const fallback = `- **Industry Position:** Leading company in the ${company.industry || 'tech'} sector.
- **Key Products/Services:** Enterprise software and consumer solutions.
- **Developer Programs / APIs:** Active developer community and open APIs.
- **CSR / Initiatives:** Committed to sustainability and education.
- **Recent News / Activities:** Recently expanded their core product line.`;

  const summary = await safeGenerate(prompt, fallback);

  await prisma.company.update({
    where: { id: companyId },
    data: { aiSummary: summary }
  });

  return { success: true, summary };
}

export async function suggestReply(companyId: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const company = await prisma.company.findUnique({ where: { id: companyId } });

  const prompt = `You are a professional sponsorship coordinator. Generate a polite, concise, and professional reply to the following response from a potential sponsor.
  
  Context of their reply: "${content}"
  Company: ${company?.companyName || 'Unknown'}
  Company Description: ${company?.aiSummary || 'Not provided'}
  
  Instructions:
  - Keep it under 3 short paragraphs.
  - Be polite and appreciative.
  - If they asked a question, address it professionally.
  - Sign off the email politely using the sender's name: ${(session.user as any).name || 'Sponsorship Team'}
  - IMPORTANT: Do not use em dashes (—), en dashes (–), or hyphens (-) to separate thoughts in sentences. Use commas, periods, or newlines instead.
  - Use markdown bolding (**word**) strategically on a few catchy, important words (like metrics, event names, or key value propositions) to attract the sponsor and draw their attention.`;

  const fallback = `Thank you for getting back to us so quickly.\n\nWe appreciate your response and look forward to the possibility of collaborating. Please let me know if you need any further information from our end.\n\nBest,\n${(session.user as any).name || 'Sponsorship Team'}`;
  const suggestion = await safeGenerate(prompt, fallback);
  return { success: true, suggestion };
}

export async function draftFullEmail(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Company not found");

  const prompt = `Write a professional, persuasive, and detailed sponsorship outreach email to a potential sponsor for **Hack Club VIT Chennai**, a student-led technology and coding community.

The target sponsor company is: ${company.companyName}
Their industry: ${company.industry || "Unknown"}
Company Context/Description: ${company.aiSummary || "Not provided"}

Context about Hack Club VIT Chennai:
- We are a community of student builders, engineers, and designers.
- Stats: 5,000+ participants reached, 20+ colleges represented, 2x Best Tech Club at VIT Chennai (2021 & 2022).
- Past Partners: Polygon, Devfolio, Appwrite, JioSaavn, ETHIndia.
- Flagship Event: HackNight 25 (36-hour offline hackathon, 5,000+ registrations, 1.25L Prize Pool).
- Other Events: h.acKnight (48-hour offline marathon), CyberX (collaboration with Chennai Police), Hack-Her (all-women 24-hour hackathon).
- Partnership Options: Challenge tracks, Prize sponsorship, Workshops/Tech talks, Talent & Recruitment (direct access to next interns/hires), Product adoption (API/toolchain usage), Mentorship & Judging.
- Acceptable Contributions: Cash, API credits, dev tools, swag, goodies, or services.
- Contact: hackclubfinance@gmail.com

The goal of the email is to introduce Hack Club VIT Chennai, thoroughly explain our scale and impact, and convince ${company.companyName} to consider a mutually beneficial partnership.

Include:
- A strong, catchy subject line prefixed with "SUBJECT: ".
- A detailed introduction about Hack Club VIT Chennai and our massive reach (mention the 5,000+ builders and 2x Best Tech Club awards).
- A breakdown of our flagship hackathons and the value they bring.
- Why partnering with Hack Club aligns perfectly with ${company.companyName} (use their Company Context to personalize this section heavily).
- Specific partnership options they could take (e.g., Challenge Track, APIs, Recruitment).
- A professional call to action asking for a quick 20-minute chat.

Guidelines:
- Make the email detailed, comprehensive, and persuasive (at least 4-5 paragraphs). Do not make it too short.
- Address the email directly to the team at ${company.companyName}.
- Make it sound like it was written by genuine, ambitious college organizers.
- Do not use generic placeholders where facts are provided above.
- IMPORTANT: Do not use em dashes (—), en dashes (–), or hyphens (-) to separate thoughts in sentences. Use commas, periods, or newlines instead.
  - Use markdown bolding (**word**) strategically on a few catchy, important words (like metrics, event names, or key value propositions) to attract the sponsor and draw their attention.
- You can use ${(session.user as any).name || 'Sponsorship Team'} for the sender signature.`;

  const fallbackBase = `SUBJECT: Exploring a partnership with ${company.companyName}\n\nHi team,\n\nI love what you are doing at ${company.companyName}. We are looking for sponsors and think you would be a great fit. Let us chat!\n\nBest,\n${(session.user as any).name || 'Sponsorship Team'}`;

  let rawText = "";
  try {
    const model = getModel();
    if (!model) {
      rawText = "AI ERROR: GEMINI_API_KEY environment variable is missing on the server.\n\n" + fallbackBase;
    } else {
      const result = await model.generateContent(prompt);
      rawText = result.response.text().trim();
    }
  } catch (error: any) {
    console.error("AI Generation Failed:", error);
    rawText = "AI ERROR: " + (error.message || String(error)) + "\n\n" + fallbackBase;
  }

  let subject = "Sponsorship Opportunity";
  let body = rawText;

  const subjectMatch = rawText.match(/^SUBJECT:\s*(.+)$/im);
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
    body = rawText.replace(subjectMatch[0], "").trim();
  }

  return { success: true, subject, body };
}
export async function getDraftEmailPrompt(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Company not found");

  const prompt = `Write a professional, persuasive, and detailed sponsorship outreach email to a potential sponsor for **Hack Club VIT Chennai**, a student-led technology and coding community.

The target sponsor company is: ${company.companyName}
Their industry: ${company.industry || "Unknown"}
Company Context/Description: ${company.aiSummary || "Not provided"}

Context about Hack Club VIT Chennai:
- We are a community of student builders, engineers, and designers.
- Stats: 5,000+ participants reached, 20+ colleges represented, 2x Best Tech Club at VIT Chennai (2021 & 2022).
- Past Partners: Polygon, Devfolio, Appwrite, JioSaavn, ETHIndia.
- Flagship Event: HackNight 25 (36-hour offline hackathon, 5,000+ registrations, 1.25L Prize Pool).
- Other Events: h.acKnight (48-hour offline marathon), CyberX (collaboration with Chennai Police), Hack-Her (all-women 24-hour hackathon).
- Partnership Options: Challenge tracks, Prize sponsorship, Workshops/Tech talks, Talent & Recruitment (direct access to next interns/hires), Product adoption (API/toolchain usage), Mentorship & Judging.
- Acceptable Contributions: Cash, API credits, dev tools, swag, goodies, or services.
- Contact: hackclubfinance@gmail.com

The goal of the email is to introduce Hack Club VIT Chennai, thoroughly explain our scale and impact, and convince ${company.companyName} to consider a mutually beneficial partnership.

Include:
- A strong, catchy subject line prefixed with "SUBJECT: ".
- A detailed introduction about Hack Club VIT Chennai and our massive reach (mention the 5,000+ builders and 2x Best Tech Club awards).
- A breakdown of our flagship hackathons and the value they bring.
- Why partnering with Hack Club aligns perfectly with ${company.companyName} (use their Company Context to personalize this section heavily).
- Specific partnership options they could take (e.g., Challenge Track, APIs, Recruitment).
- A professional call to action asking for a quick 20-minute chat.

Guidelines:
- Make the email detailed, comprehensive, and persuasive (at least 4-5 paragraphs). Do not make it too short.
- Address the email directly to the team at ${company.companyName}.
- Make it sound like it was written by genuine, ambitious college organizers.
- Do not use generic placeholders where facts are provided above.
- IMPORTANT: Do not use em dashes (—), en dashes (–), or hyphens (-) to separate thoughts in sentences. Use commas, periods, or newlines instead.
  - Use markdown bolding (**word**) strategically on a few catchy, important words (like metrics, event names, or key value propositions) to attract the sponsor and draw their attention.
- You can use ${(session.user as any).name || 'Sponsorship Team'} for the sender signature.`;

  return { apiKey: process.env.GEMINI_API_KEY || "", prompt, companyName: company.companyName };
}

