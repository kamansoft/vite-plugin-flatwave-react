import type { FlatwaveContentOptions, ValidationResult } from '../types';
export declare function validateContent(options: FlatwaveContentOptions): Promise<ValidationResult>;
export declare function discoverComponents(componentsDir?: string | string[]): Promise<Set<string>>;
