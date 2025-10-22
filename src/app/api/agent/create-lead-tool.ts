/**
 * This creates a simple tool wrapper that the AI can use to create leads directly in the database
 * for demo purposes. It doesn't require HubSpot connection.
 */

import { createLead } from "@/lib/db/queries";
import { tool } from "ai";
import { z } from "zod";

const createLeadSchema = z.object({
  name: z.string().describe("Full name of the lead"),
  email: z.string().email().describe("Email address of the lead"),
  company: z.string().optional().describe("Company name"),
  potential: z.number().min(0).max(100).optional().describe("Lead potential score (0-100). Default is based on email domain."),
  status: z.enum(["new", "contacted", "waiting_reply", "qualified", "won", "lost"]).optional().describe("Current status of the lead"),
  owner: z.string().optional().describe("Who the lead is assigned to"),
});

export const createLeadTool = tool({
  description: "Create a new lead in the CRM database. Use this when the user asks to create a lead, add a lead, or set up lead automation.",
  inputSchema: createLeadSchema,
  execute: async (params: z.infer<typeof createLeadSchema>) => {
    const { name, email, company, potential, status, owner } = params;
    try {
      // Generate ID
      const id = `L-${Date.now()}`;
      
      // Calculate potential score if not provided
      let calculatedPotential = potential;
      if (!calculatedPotential) {
        // Simple business email check
        const isBusinessEmail = !email.match(/@(gmail|yahoo|hotmail|outlook|aol)\./i);
        calculatedPotential = isBusinessEmail ? 75 : 50;
      }
      
      const lead = await createLead({
        id,
        name,
        email,
        company: company || null,
        potential: calculatedPotential,
        status: status || "new",
        owner: owner || null,
        createdAt: new Date(),
        lastContactAt: null,
      });
      
      return {
        success: true,
        leadId: lead.id,
        message: `Successfully created lead: ${name} from ${company || email}`,
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          company: lead.company,
          potential: lead.potential,
          status: lead.status,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create lead",
      };
    }
  },
});

