import dns from 'dns';
import { promisify } from 'util';
import { logger } from '../../utils/logger';

const resolveMx = promisify(dns.resolveMx);

export interface ValidationResult {
  isValid: boolean;
  email: string;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
  metadata: {
    domain: string;
    localPart: string;
    isDisposable: boolean;
    isRole: boolean;
    hasValidMx: boolean;
    riskScore: number;
  };
}

export interface BulkValidationResult {
  totalEmails: number;
  valid: number;
  invalid: number;
  risky: number;
  results: ValidationResult[];
  summary: {
    commonErrors: Array<{ error: string; count: number }>;
    domainDistribution: Array<{ domain: string; count: number }>;
    riskDistribution: Record<string, number>;
  };
}

export interface ValidationOptions {
  checkMx?: boolean;
  checkDisposable?: boolean;
  checkRole?: boolean;
  allowInternational?: boolean;
  strictMode?: boolean;
  timeout?: number;
}

export class EmailValidator {
  private disposableDomains: Set<string> = new Set();
  private rolePrefixes: Set<string> = new Set();
  private commonTypos: Map<string, string> = new Map();
  private validationCache: Map<string, ValidationResult> = new Map();
  private cacheExpiryMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Load disposable email domains
    this.disposableDomains = new Set([
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'temp-mail.org',
      'throwaway.email',
      'getnada.com',
      'maildrop.cc',
      'tempmail.net',
      'guerrillamailblock.com',
      'yopmail.com',
      'mohmal.com',
      'sharklasers.com',
      'mailnesia.com',
      'dispostable.com'
    ]);

    // Load common role-based email prefixes
    this.rolePrefixes = new Set([
      'admin',
      'administrator',
      'support',
      'info',
      'contact',
      'sales',
      'marketing',
      'noreply',
      'no-reply',
      'help',
      'service',
      'webmaster',
      'postmaster',
      'root',
      'abuse',
      'security',
      'billing',
      'accounts',
      'hr',
      'jobs',
      'careers'
    ]);

    // Load common typos and suggestions
    this.commonTypos = new Map([
      ['gmail.co', 'gmail.com'],
      ['gmail.con', 'gmail.com'],
      ['gmai.com', 'gmail.com'],
      ['gmial.com', 'gmail.com'],
      ['yahoo.co', 'yahoo.com'],
      ['yahoo.con', 'yahoo.com'],
      ['yaho.com', 'yahoo.com'],
      ['hotmai.com', 'hotmail.com'],
      ['hotmial.com', 'hotmail.com'],
      ['hotmal.com', 'hotmail.com'],
      ['outlok.com', 'outlook.com'],
      ['outloo.com', 'outlook.com'],
      ['outlook.co', 'outlook.com'],
      ['aol.co', 'aol.com'],
      ['comcast.net', 'comcast.net'],
      ['verizon.net', 'verizon.net']
    ]);
  }

  async validateEmail(email: string, options: ValidationOptions = {}): Promise<ValidationResult> {
    const defaultOptions: Required<ValidationOptions> = {
      checkMx: true,
      checkDisposable: true,
      checkRole: true,
      allowInternational: true,
      strictMode: false,
      timeout: 5000,
      ...options
    };

    // Check cache first
    const cacheKey = `${email.toLowerCase()}-${JSON.stringify(options)}`;
    const cached = this.validationCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const result = await this.performValidation(email, defaultOptions);
    
    // Cache the result
    this.validationCache.set(cacheKey, result);
    
    return result;
  }

  private async performValidation(email: string, options: Required<ValidationOptions>): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      email: email.trim().toLowerCase(),
      errors: [],
      warnings: [],
      suggestions: [],
      metadata: {
        domain: '',
        localPart: '',
        isDisposable: false,
        isRole: false,
        hasValidMx: false,
        riskScore: 0
      }
    };

    try {
      // Basic format validation
      if (!this.isValidFormat(email, options.allowInternational)) {
        result.errors.push('Invalid email format');
        return result;
      }

      // Parse email parts
      const [localPart, domain] = email.toLowerCase().trim().split('@');
      result.metadata.localPart = localPart;
      result.metadata.domain = domain;

      // Check for empty parts
      if (!localPart || !domain) {
        result.errors.push('Email must contain both local and domain parts');
        return result;
      }

      // Validate local part
      await this.validateLocalPart(localPart, result, options);

      // Validate domain part
      await this.validateDomain(domain, result, options);

      // Check for typos and provide suggestions
      this.checkTypos(domain, result);

      // Calculate risk score
      result.metadata.riskScore = this.calculateRiskScore(result);

      // Final validation decision
      result.isValid = result.errors.length === 0 && (!options.strictMode || result.warnings.length === 0);

    } catch (error) {
      logger.error('Email validation error:', error);
      result.errors.push('Validation process failed');
    }

    return result;
  }

  private isValidFormat(email: string, allowInternational: boolean): boolean {
    if (allowInternational) {
      // More permissive regex for international emails
      const internationalRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      return internationalRegex.test(email);
    } else {
      // Strict ASCII-only regex
      const strictRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return strictRegex.test(email);
    }
  }

  private async validateLocalPart(localPart: string, result: ValidationResult, options: Required<ValidationOptions>) {
    // Length check
    if (localPart.length > 64) {
      result.errors.push('Local part cannot exceed 64 characters');
    }

    // Check for consecutive dots
    if (localPart.includes('..')) {
      result.errors.push('Consecutive dots are not allowed in local part');
    }

    // Check for leading/trailing dots
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      result.errors.push('Local part cannot start or end with a dot');
    }

    // Check for role-based addresses
    if (options.checkRole && this.isRoleBasedEmail(localPart)) {
      result.metadata.isRole = true;
      result.warnings.push('This appears to be a role-based email address');
    }

    // Check for suspicious patterns
    if (this.hasSuspiciousPattern(localPart)) {
      result.warnings.push('Email contains suspicious patterns');
    }
  }

  private async validateDomain(domain: string, result: ValidationResult, options: Required<ValidationOptions>) {
    // Basic domain format validation
    if (domain.length > 255) {
      result.errors.push('Domain cannot exceed 255 characters');
      return;
    }

    // Check for valid domain format
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(domain)) {
      result.errors.push('Invalid domain format');
      return;
    }

    // Check if domain has TLD
    if (!domain.includes('.')) {
      result.errors.push('Domain must contain a top-level domain');
      return;
    }

    // Check for disposable email domains
    if (options.checkDisposable && this.isDisposableDomain(domain)) {
      result.metadata.isDisposable = true;
      result.warnings.push('This is a disposable email domain');
    }

    // Check MX records
    if (options.checkMx) {
      try {
        await Promise.race([
          this.checkMxRecords(domain, result),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('MX check timeout')), options.timeout)
          )
        ]);
      } catch (error) {
        result.warnings.push('Could not verify MX records for domain');
        logger.debug(`MX check failed for ${domain}:`, error);
      }
    }
  }

  private async checkMxRecords(domain: string, result: ValidationResult): Promise<void> {
    try {
      const mxRecords = await resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        result.metadata.hasValidMx = true;
      } else {
        result.warnings.push('Domain has no MX records');
      }
    } catch (error) {
      // Try checking the A record as fallback
      try {
        const aRecords = await promisify(dns.resolve4)(domain);
        if (aRecords && aRecords.length > 0) {
          result.metadata.hasValidMx = true;
          result.warnings.push('Domain uses A record instead of MX record');
        } else {
          result.errors.push('Domain does not exist or has no mail servers');
        }
      } catch (aError) {
        result.errors.push('Domain does not exist or has no mail servers');
      }
    }
  }

  private isRoleBasedEmail(localPart: string): boolean {
    const cleanedLocalPart = localPart.toLowerCase().replace(/[.\-_]/g, '');
    return this.rolePrefixes.has(cleanedLocalPart) || 
           Array.from(this.rolePrefixes).some(role => cleanedLocalPart.includes(role));
  }

  private isDisposableDomain(domain: string): boolean {
    return this.disposableDomains.has(domain.toLowerCase());
  }

  private hasSuspiciousPattern(localPart: string): boolean {
    // Check for patterns that might indicate fake emails
    const suspiciousPatterns = [
      /^[a-z]{1,2}[0-9]{6,}$/, // Very short name + many numbers
      /^(test|fake|spam|temp|dummy)[0-9]*$/i,
      /^[0-9]+$/, // Only numbers
      /^.{1,2}$/, // Too short
      /^[a-z]\.?[a-z]\.?[a-z]\.?[0-9]+$/ // Pattern like a.b.c123
    ];

    return suspiciousPatterns.some(pattern => pattern.test(localPart));
  }

  private checkTypos(domain: string, result: ValidationResult) {
    const suggestion = this.commonTypos.get(domain);
    if (suggestion) {
      result.warnings.push('Possible typo in domain');
      result.suggestions = [`Did you mean ${result.metadata.localPart}@${suggestion}?`];
    }

    // Check for common TLD typos
    const tld = domain.split('.').pop();
    if (tld) {
      const tldSuggestions: Record<string, string> = {
        'co': 'com',
        'con': 'com',
        'cm': 'com',
        'cmo': 'com',
        'om': 'com',
        'orh': 'org',
        'ogr': 'org',
        'rog': 'org',
        'nte': 'net',
        'ent': 'net',
        'ten': 'net'
      };

      const tldSuggestion = tldSuggestions[tld];
      if (tldSuggestion) {
        const suggestedDomain = domain.replace(new RegExp(`\\.${tld}$`), `.${tldSuggestion}`);
        result.warnings.push('Possible typo in top-level domain');
        if (!result.suggestions) result.suggestions = [];
        result.suggestions.push(`Did you mean ${result.metadata.localPart}@${suggestedDomain}?`);
      }
    }
  }

  private calculateRiskScore(result: ValidationResult): number {
    let score = 0;

    // Add points for each risk factor
    if (result.errors.length > 0) score += 100; // Invalid emails get maximum risk
    if (result.metadata.isDisposable) score += 60;
    if (result.metadata.isRole) score += 30;
    if (!result.metadata.hasValidMx) score += 40;
    if (result.warnings.length > 0) score += result.warnings.length * 10;

    // Reduce score for positive indicators
    if (result.metadata.hasValidMx && result.errors.length === 0) score -= 20;

    return Math.min(100, Math.max(0, score));
  }

  async validateBulk(emails: string[], options: ValidationOptions = {}): Promise<BulkValidationResult> {
    const results: ValidationResult[] = [];
    const errors: Record<string, number> = {};
    const domains: Record<string, number> = {};
    const risks: Record<string, number> = { low: 0, medium: 0, high: 0 };

    // Process emails in batches to avoid overwhelming the system
    const batchSize = 100;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(email => this.validateEmail(email, options));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const promiseResult of batchResults) {
        if (promiseResult.status === 'fulfilled') {
          const result = promiseResult.value;
          results.push(result);

          // Collect statistics
          result.errors.forEach(error => {
            errors[error] = (errors[error] || 0) + 1;
          });

          domains[result.metadata.domain] = (domains[result.metadata.domain] || 0) + 1;

          if (result.metadata.riskScore < 30) risks.low++;
          else if (result.metadata.riskScore < 70) risks.medium++;
          else risks.high++;
        }
      }
    }

    const valid = results.filter(r => r.isValid).length;
    const invalid = results.filter(r => !r.isValid).length;
    const risky = results.filter(r => r.metadata.riskScore > 50).length;

    return {
      totalEmails: emails.length,
      valid,
      invalid,
      risky,
      results,
      summary: {
        commonErrors: Object.entries(errors)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([error, count]) => ({ error, count })),
        domainDistribution: Object.entries(domains)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .map(([domain, count]) => ({ domain, count })),
        riskDistribution: risks
      }
    };
  }

  async addDisposableDomain(domain: string): Promise<void> {
    this.disposableDomains.add(domain.toLowerCase());
    logger.info(`Added disposable domain: ${domain}`);
  }

  async addRolePrefix(prefix: string): Promise<void> {
    this.rolePrefixes.add(prefix.toLowerCase());
    logger.info(`Added role prefix: ${prefix}`);
  }

  async addTypoSuggestion(typo: string, correction: string): Promise<void> {
    this.commonTypos.set(typo.toLowerCase(), correction.toLowerCase());
    logger.info(`Added typo suggestion: ${typo} -> ${correction}`);
  }

  getValidationStats(): {
    cacheSize: number;
    disposableDomains: number;
    rolePrefixes: number;
    typoSuggestions: number;
  } {
    return {
      cacheSize: this.validationCache.size,
      disposableDomains: this.disposableDomains.size,
      rolePrefixes: this.rolePrefixes.size,
      typoSuggestions: this.commonTypos.size
    };
  }

  async cleanupCache(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, result] of this.validationCache.entries()) {
      if (!this.isCacheValid(result)) {
        this.validationCache.delete(key);
        cleaned++;
      }
    }

    logger.info(`Cleaned up ${cleaned} expired validation cache entries`);
    return cleaned;
  }

  private isCacheValid(result: ValidationResult): boolean {
    // For now, all cached results are considered valid within the expiry time
    // In a real implementation, you might add timestamp metadata to results
    return true;
  }

  // Export functions for testing and configuration management
  async exportConfiguration(): Promise<{
    disposableDomains: string[];
    rolePrefixes: string[];
    typoSuggestions: Record<string, string>;
  }> {
    return {
      disposableDomains: Array.from(this.disposableDomains),
      rolePrefixes: Array.from(this.rolePrefixes),
      typoSuggestions: Object.fromEntries(this.commonTypos)
    };
  }

  async importConfiguration(config: {
    disposableDomains?: string[];
    rolePrefixes?: string[];
    typoSuggestions?: Record<string, string>;
  }): Promise<void> {
    if (config.disposableDomains) {
      config.disposableDomains.forEach(domain => this.disposableDomains.add(domain.toLowerCase()));
    }

    if (config.rolePrefixes) {
      config.rolePrefixes.forEach(prefix => this.rolePrefixes.add(prefix.toLowerCase()));
    }

    if (config.typoSuggestions) {
      for (const [typo, correction] of Object.entries(config.typoSuggestions)) {
        this.commonTypos.set(typo.toLowerCase(), correction.toLowerCase());
      }
    }

    logger.info('Email validator configuration imported');
  }
}

export default EmailValidator;