'use strict';

/** An error safe to show to the customer, with an optional Arabic message. */
class AppError extends Error {
  constructor(message, { status = 400, ar = null } = {}) {
    super(message);
    this.status = status;
    this.ar = ar;
  }
}

module.exports = { AppError };
