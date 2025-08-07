import { EmailWorkflow, EmailWorkflowStep, EmailWorkflowTrigger, EmailWorkflowStats } from '../types/email';
import { EmailService } from '../services/EmailService';
import { logger } from '../../utils/logger';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  contactId: string;
  currentStepId: string;
  status: 'active' | 'completed' | 'paused' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  variables: Record<string, any>;
  history: WorkflowExecutionStep[];
}

export interface WorkflowExecutionStep {
  stepId: string;
  executedAt: Date;
  status: 'completed' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  nextSteps: string[];
}

export interface TriggerEvent {
  type: string;
  contactId: string;
  data: Record<string, any>;
  timestamp: Date;
}

export class WorkflowEngine {
  private emailService: EmailService;
  private workflows: Map<string, EmailWorkflow> = new Map();
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.emailService = new EmailService();
    this.loadWorkflows();
    this.startTriggerListener();
  }

  private async loadWorkflows() {
    try {
      // Load workflows from database
      // For now, create some sample workflows
      const sampleWorkflows = this.createSampleWorkflows();
      for (const workflow of sampleWorkflows) {
        this.workflows.set(workflow.id, workflow);
      }
      
      logger.info(`Loaded ${this.workflows.size} workflows`);
    } catch (error) {
      logger.error('Failed to load workflows:', error);
    }
  }

  private createSampleWorkflows(): EmailWorkflow[] {
    return [
      {
        id: 'welcome-series',
        name: 'Welcome Email Series',
        description: 'Automated welcome series for new users',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        trigger: {
          type: 'user_signup',
          conditions: {},
          schedule: { type: 'immediate' }
        },
        steps: [
          {
            id: 'welcome-email',
            type: 'send_email',
            order: 1,
            config: {
              templateId: 'welcome',
              subject: 'Welcome to ACE CRM, {{firstName}}!',
              customData: { source: 'welcome-series' }
            },
            nextSteps: ['wait-3-days']
          },
          {
            id: 'wait-3-days',
            type: 'wait',
            order: 2,
            config: {
              waitDuration: 3 * 24 * 60 // 3 days in minutes
            },
            nextSteps: ['setup-reminder']
          },
          {
            id: 'setup-reminder',
            type: 'send_email',
            order: 3,
            config: {
              templateId: 'setup-reminder',
              subject: 'Complete your ACE CRM setup',
              customData: { source: 'welcome-series' }
            },
            nextSteps: ['wait-7-days']
          },
          {
            id: 'wait-7-days',
            type: 'wait',
            order: 4,
            config: {
              waitDuration: 7 * 24 * 60 // 7 days in minutes
            },
            nextSteps: ['tips-email']
          },
          {
            id: 'tips-email',
            type: 'send_email',
            order: 5,
            config: {
              templateId: 'pro-tips',
              subject: 'Pro tips to get the most out of ACE CRM',
              customData: { source: 'welcome-series' }
            },
            nextSteps: []
          }
        ],
        stats: {
          totalEntered: 0,
          completed: 0,
          currentlyActive: 0,
          emailsSent: 0,
          openRate: 0,
          clickRate: 0,
          conversionRate: 0
        }
      },
      {
        id: 'cart-abandonment',
        name: 'Cart Abandonment Recovery',
        description: 'Re-engage users who abandoned their cart',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        trigger: {
          type: 'cart_abandonment',
          conditions: { cartValue: { min: 50 } },
          schedule: { type: 'delay', delay: 60 } // 1 hour delay
        },
        steps: [
          {
            id: 'abandonment-reminder',
            type: 'send_email',
            order: 1,
            config: {
              templateId: 'cart-abandonment',
              subject: 'You left something in your cart',
              customData: { source: 'cart-abandonment' }
            },
            nextSteps: ['wait-24-hours']
          },
          {
            id: 'wait-24-hours',
            type: 'wait',
            order: 2,
            config: {
              waitDuration: 24 * 60 // 24 hours
            },
            nextSteps: ['check-purchase']
          },
          {
            id: 'check-purchase',
            type: 'condition',
            order: 3,
            config: {
              condition: {
                field: 'hasPurchased',
                operator: 'equals',
                value: false
              }
            },
            nextSteps: ['discount-offer', 'mark-converted']
          },
          {
            id: 'discount-offer',
            type: 'send_email',
            order: 4,
            config: {
              templateId: 'cart-discount',
              subject: 'Complete your purchase and save 10%',
              customData: { source: 'cart-abandonment', discount: '10%' }
            },
            nextSteps: []
          },
          {
            id: 'mark-converted',
            type: 'update_contact',
            order: 4,
            config: {
              updateFields: { cartAbandonmentConverted: true }
            },
            nextSteps: []
          }
        ],
        stats: {
          totalEntered: 0,
          completed: 0,
          currentlyActive: 0,
          emailsSent: 0,
          openRate: 0,
          clickRate: 0,
          conversionRate: 0
        }
      }
    ];
  }

  private startTriggerListener() {
    // In a real implementation, this would listen to events from your application
    // For now, we'll just set up the basic structure
    logger.info('Workflow trigger listener started');
  }

  async handleTriggerEvent(event: TriggerEvent): Promise<void> {
    logger.info(`Processing trigger event: ${event.type} for contact ${event.contactId}`);

    // Find workflows that match this trigger
    const matchingWorkflows = Array.from(this.workflows.values())
      .filter(workflow => 
        workflow.isActive && 
        workflow.trigger.type === event.type &&
        this.evaluateTriggerConditions(workflow.trigger, event)
      );

    // Start execution for each matching workflow
    for (const workflow of matchingWorkflows) {
      await this.startWorkflowExecution(workflow, event);
    }
  }

  private evaluateTriggerConditions(trigger: EmailWorkflowTrigger, event: TriggerEvent): boolean {
    if (!trigger.conditions) return true;

    // Evaluate trigger conditions against event data
    for (const [field, condition] of Object.entries(trigger.conditions)) {
      const eventValue = event.data[field];
      
      if (typeof condition === 'object' && condition !== null) {
        if ('min' in condition && eventValue < condition.min) return false;
        if ('max' in condition && eventValue > condition.max) return false;
      } else {
        if (eventValue !== condition) return false;
      }
    }

    return true;
  }

  private async startWorkflowExecution(workflow: EmailWorkflow, event: TriggerEvent): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId: workflow.id,
      contactId: event.contactId,
      currentStepId: workflow.steps[0]?.id || '',
      status: 'active',
      startedAt: new Date(),
      variables: { ...event.data },
      history: []
    };

    this.activeExecutions.set(execution.id, execution);
    workflow.stats.totalEntered++;
    workflow.stats.currentlyActive++;

    logger.info(`Started workflow execution: ${execution.id} for workflow: ${workflow.name}`);

    // Handle initial delay if specified
    if (workflow.trigger.schedule?.type === 'delay' && workflow.trigger.schedule.delay) {
      this.scheduleStepExecution(execution, workflow.steps[0], workflow.trigger.schedule.delay);
    } else {
      // Execute first step immediately
      await this.executeStep(execution, workflow.steps[0]);
    }

    return execution;
  }

  private async executeStep(execution: WorkflowExecution, step: EmailWorkflowStep): Promise<void> {
    logger.info(`Executing step: ${step.id} for execution: ${execution.id}`);

    const stepExecution: WorkflowExecutionStep = {
      stepId: step.id,
      executedAt: new Date(),
      status: 'completed',
      nextSteps: step.nextSteps
    };

    try {
      switch (step.type) {
        case 'send_email':
          await this.executeSendEmailStep(execution, step);
          break;
        case 'wait':
          await this.executeWaitStep(execution, step);
          break;
        case 'condition':
          stepExecution.nextSteps = await this.executeConditionStep(execution, step);
          break;
        case 'update_contact':
          await this.executeUpdateContactStep(execution, step);
          break;
        case 'add_tag':
          await this.executeAddTagStep(execution, step);
          break;
        case 'remove_tag':
          await this.executeRemoveTagStep(execution, step);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      execution.history.push(stepExecution);
      
      // Schedule next steps
      await this.scheduleNextSteps(execution, stepExecution.nextSteps);
      
    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.history.push(stepExecution);
      execution.status = 'failed';
      
      logger.error(`Step execution failed: ${step.id}`, error);
    }
  }

  private async executeSendEmailStep(execution: WorkflowExecution, step: EmailWorkflowStep): Promise<void> {
    const config = step.config;
    if (!config.templateId || !config.subject) {
      throw new Error('Email step missing required configuration');
    }

    // Get contact information
    const contact = await this.getContactById(execution.contactId);
    if (!contact) {
      throw new Error(`Contact not found: ${execution.contactId}`);
    }

    // Merge variables
    const templateData = {
      ...contact,
      ...execution.variables,
      ...config.customData
    };

    // Send email
    const result = await this.emailService.sendTemplate(config.templateId, {
      to: contact.email,
      subject: this.renderTemplate(config.subject, templateData),
      templateData,
      workflowId: execution.workflowId,
      metadata: {
        executionId: execution.id,
        stepId: step.id
      }
    });

    if (result.status !== 'sent') {
      throw new Error(`Failed to send email: ${result.error}`);
    }

    // Update workflow stats
    const workflow = this.workflows.get(execution.workflowId);
    if (workflow) {
      workflow.stats.emailsSent++;
    }

    logger.info(`Email sent for step: ${step.id}, execution: ${execution.id}`);
  }

  private async executeWaitStep(execution: WorkflowExecution, step: EmailWorkflowStep): Promise<void> {
    const waitDuration = step.config.waitDuration;
    if (!waitDuration) {
      throw new Error('Wait step missing duration configuration');
    }

    // Schedule the next step execution
    const delayMs = waitDuration * 60 * 1000; // Convert minutes to milliseconds
    
    setTimeout(async () => {
      await this.scheduleNextSteps(execution, step.nextSteps);
    }, delayMs);

    logger.info(`Wait step scheduled: ${waitDuration} minutes for execution: ${execution.id}`);
  }

  private async executeConditionStep(execution: WorkflowExecution, step: EmailWorkflowStep): Promise<string[]> {
    const condition = step.config.condition;
    if (!condition) {
      throw new Error('Condition step missing condition configuration');
    }

    // Get the value to evaluate
    const value = this.getVariableValue(execution.variables, condition.field);
    
    // Evaluate condition
    const conditionMet = this.evaluateCondition(value, condition.operator, condition.value);
    
    // Return appropriate next steps based on condition result
    if (conditionMet && step.nextSteps.length > 0) {
      return [step.nextSteps[0]]; // True path
    } else if (!conditionMet && step.nextSteps.length > 1) {
      return [step.nextSteps[1]]; // False path
    }
    
    return [];
  }

  private async executeUpdateContactStep(execution: WorkflowExecution, step: EmailWorkflowStep): Promise<void> {
    const updateFields = step.config.updateFields;
    if (!updateFields) {
      throw new Error('Update contact step missing update fields');
    }

    // Update contact in database
    await this.updateContact(execution.contactId, updateFields);
    
    // Update execution variables
    Object.assign(execution.variables, updateFields);
    
    logger.info(`Contact updated for execution: ${execution.id}`);
  }

  private async executeAddTagStep(execution: WorkflowExecution, step: EmailWorkflowStep): Promise<void> {
    const tags = step.config.tags;
    if (!tags || !Array.isArray(tags)) {
      throw new Error('Add tag step missing tags configuration');
    }

    await this.addTagsToContact(execution.contactId, tags);
    
    logger.info(`Tags added to contact: ${execution.contactId}`);
  }

  private async executeRemoveTagStep(execution: WorkflowExecution, step: EmailWorkflowStep): Promise<void> {
    const tags = step.config.tags;
    if (!tags || !Array.isArray(tags)) {
      throw new Error('Remove tag step missing tags configuration');
    }

    await this.removeTagsFromContact(execution.contactId, tags);
    
    logger.info(`Tags removed from contact: ${execution.contactId}`);
  }

  private async scheduleNextSteps(execution: WorkflowExecution, nextStepIds: string[]): Promise<void> {
    if (nextStepIds.length === 0) {
      // Workflow completed
      execution.status = 'completed';
      execution.completedAt = new Date();
      
      const workflow = this.workflows.get(execution.workflowId);
      if (workflow) {
        workflow.stats.completed++;
        workflow.stats.currentlyActive--;
      }
      
      this.activeExecutions.delete(execution.id);
      logger.info(`Workflow execution completed: ${execution.id}`);
      return;
    }

    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) return;

    // Execute next steps
    for (const stepId of nextStepIds) {
      const nextStep = workflow.steps.find(s => s.id === stepId);
      if (nextStep) {
        execution.currentStepId = stepId;
        await this.executeStep(execution, nextStep);
      }
    }
  }

  private scheduleStepExecution(execution: WorkflowExecution, step: EmailWorkflowStep, delayMinutes: number): void {
    const delayMs = delayMinutes * 60 * 1000;
    
    const timeoutId = setTimeout(async () => {
      await this.executeStep(execution, step);
      this.scheduledTasks.delete(`${execution.id}_${step.id}`);
    }, delayMs);
    
    this.scheduledTasks.set(`${execution.id}_${step.id}`, timeoutId);
  }

  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expectedValue;
      case 'not_equals':
        return value !== expectedValue;
      case 'greater_than':
        return value > expectedValue;
      case 'less_than':
        return value < expectedValue;
      case 'contains':
        return String(value).includes(String(expectedValue));
      case 'not_contains':
        return !String(value).includes(String(expectedValue));
      case 'is_null':
        return value == null;
      case 'is_not_null':
        return value != null;
      default:
        return false;
    }
  }

  private getVariableValue(variables: Record<string, any>, field: string): any {
    return field.split('.').reduce((obj, key) => obj && obj[key], variables);
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }
    return rendered;
  }

  // Mock methods - these would integrate with your actual database/services
  private async getContactById(contactId: string): Promise<any> {
    // Mock contact data
    return {
      id: contactId,
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date()
    };
  }

  private async updateContact(contactId: string, updateFields: Record<string, any>): Promise<void> {
    // Update contact in database
    logger.debug(`Updating contact ${contactId}:`, updateFields);
  }

  private async addTagsToContact(contactId: string, tags: string[]): Promise<void> {
    // Add tags to contact in database
    logger.debug(`Adding tags to contact ${contactId}:`, tags);
  }

  private async removeTagsFromContact(contactId: string, tags: string[]): Promise<void> {
    // Remove tags from contact in database
    logger.debug(`Removing tags from contact ${contactId}:`, tags);
  }

  // Public API methods
  async createWorkflow(workflowData: Omit<EmailWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'stats'>): Promise<EmailWorkflow> {
    const workflow: EmailWorkflow = {
      ...workflowData,
      id: this.generateWorkflowId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalEntered: 0,
        completed: 0,
        currentlyActive: 0,
        emailsSent: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0
      }
    };

    this.workflows.set(workflow.id, workflow);
    await this.saveWorkflow(workflow);

    return workflow;
  }

  async getWorkflows(): Promise<EmailWorkflow[]> {
    return Array.from(this.workflows.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getWorkflow(workflowId: string): Promise<EmailWorkflow | undefined> {
    return this.workflows.get(workflowId);
  }

  async updateWorkflow(workflowId: string, updates: Partial<EmailWorkflow>): Promise<EmailWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    Object.assign(workflow, updates, { updatedAt: new Date() });
    await this.saveWorkflow(workflow);

    return workflow;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Cancel any active executions
    const activeExecutions = Array.from(this.activeExecutions.values())
      .filter(execution => execution.workflowId === workflowId);

    for (const execution of activeExecutions) {
      execution.status = 'paused';
      this.activeExecutions.delete(execution.id);
    }

    this.workflows.delete(workflowId);
    await this.deleteWorkflowFromStorage(workflowId);
  }

  async pauseWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.isActive = false;
    workflow.updatedAt = new Date();
    await this.saveWorkflow(workflow);
  }

  async resumeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    workflow.isActive = true;
    workflow.updatedAt = new Date();
    await this.saveWorkflow(workflow);
  }

  async getActiveExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    let executions = Array.from(this.activeExecutions.values());
    
    if (workflowId) {
      executions = executions.filter(e => e.workflowId === workflowId);
    }
    
    return executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveWorkflow(workflow: EmailWorkflow): Promise<void> {
    // Save to database
    logger.debug(`Saved workflow: ${workflow.id}`);
  }

  private async deleteWorkflowFromStorage(workflowId: string): Promise<void> {
    // Delete from database
    logger.debug(`Deleted workflow: ${workflowId}`);
  }
}

export default WorkflowEngine;