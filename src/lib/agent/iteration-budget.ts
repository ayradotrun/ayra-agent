/**
 * Per-agent iteration budget — consume/refund counter.
 * Ported from hermes-agent agent/iteration_budget.py
 */

export class IterationBudget {
  private used = 0;

  constructor(public readonly maxTotal: number) {}

  consume(): boolean {
    if (this.used >= this.maxTotal) return false;
    this.used += 1;
    return true;
  }

  refund(): void {
    if (this.used > 0) this.used -= 1;
  }

  get usedCount(): number {
    return this.used;
  }

  get remaining(): number {
    return Math.max(0, this.maxTotal - this.used);
  }
}
