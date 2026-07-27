import hbs from 'hbs';

export const builtinHelpers = {
  /**
   * Converts a value or object to string (JSON.stringify for objects).
   */
  str(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  },

  /**
   * Parses a JSON string into an object.
   */
  json(val: any): any {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (err) {
        return null;
      }
    }
    return val;
  },

  /**
   * Converts value to lowercase string.
   */
  lower(val: any): string {
    return String(val ?? '').toLowerCase();
  },

  /**
   * Converts value to uppercase string.
   */
  upper(val: any): string {
    return String(val ?? '').toUpperCase();
  },

  /**
   * Capitalizes first character of string.
   */
  capitalize(val: any): string {
    const s = String(val ?? '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  },

  /**
   * Truncates string to specified length.
   */
  truncate(val: any, len: number = 50): string {
    const s = String(val ?? '');
    return s.length > len ? s.slice(0, len) + '...' : s;
  },

  /**
   * Equality check helper (a === b).
   */
  eq(a: any, b: any): boolean {
    return a === b;
  },

  /**
   * Inequality check helper (a !== b).
   */
  ne(a: any, b: any): boolean {
    return a !== b;
  },

  /**
   * Greater than check helper (a > b).
   */
  gt(a: any, b: any): boolean {
    return a > b;
  },

  /**
   * Greater than or equal check helper (a >= b).
   */
  gte(a: any, b: any): boolean {
    return a >= b;
  },

  /**
   * Less than check helper (a < b).
   */
  lt(a: any, b: any): boolean {
    return a < b;
  },

  /**
   * Less than or equal check helper (a <= b).
   */
  lte(a: any, b: any): boolean {
    return a <= b;
  },

  /**
   * Logical AND for all arguments.
   */
  and(...args: any[]): boolean {
    return args.every(Boolean);
  },

  /**
   * Logical OR for arguments.
   */
  or(...args: any[]): boolean {
    return args.some(Boolean);
  },

  /**
   * Logical NOT.
   */
  not(val: any): boolean {
    return !val;
  },

  /**
   * Returns length of array, string, or object keys.
   */
  len(val: any): number {
    if (!val) return 0;
    if (Array.isArray(val) || typeof val === 'string') return val.length;
    if (typeof val === 'object') return Object.keys(val).length;
    return 0;
  },

  /**
   * Checks if array or string contains target value.
   */
  contains(arr: any, val: any): boolean {
    if (!arr) return false;
    if (Array.isArray(arr) || typeof arr === 'string') return arr.includes(val);
    return false;
  },

  includes(arr: any, val: any): boolean {
    if (!arr) return false;
    if (Array.isArray(arr) || typeof arr === 'string') return arr.includes(val);
    return false;
  },

  /**
   * Joins array elements into string.
   */
  join(arr: any[], sep: string = ', '): string {
    return Array.isArray(arr) ? arr.join(sep) : String(arr ?? '');
  },

  /**
   * Addition helper.
   */
  add(a: number, b: number): number {
    return Number(a) + Number(b);
  },

  /**
   * Subtraction helper.
   */
  sub(a: number, b: number): number {
    return Number(a) - Number(b);
  },

  /**
   * Ternary condition helper (cond ? trueVal : falseVal).
   */
  ternary(cond: any, trueVal: any, falseVal: any): any {
    return cond ? trueVal : falseVal;
  },
};

/**
 * Registers all built-in helpers with Handlebars.
 */
export function registerBuiltinHelpers(): void {
  Object.entries(builtinHelpers).forEach(([name, fn]) => {
    hbs.registerHelper(name, function (...args: any[]) {
      const cleanArgs = args.slice(0, -1);
      return (fn as Function)(...cleanArgs);
    });
  });
}
