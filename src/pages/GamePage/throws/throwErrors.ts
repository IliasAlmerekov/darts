export class ThrowRejectedError extends Error {
  constructor(message = "Throw request was not accepted by server") {
    super(message);
    this.name = "ThrowRejectedError";
  }
}
