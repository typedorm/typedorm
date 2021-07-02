export class InvalidParallelScanLimitOptionError extends Error {
  name = 'InvalidParallelScanLimitOptionError';
  constructor(limit: number, limitPerSegment: number) {
    super();
    this.message = `Invalid scan option "limit", when using parallel scan, value for "limitPerSegment" cannot be greater than "limit". Consider using a scan operation instead.    
    limit: ${limit}
    limitPerSegment: ${limitPerSegment}
    `;
  }
}
