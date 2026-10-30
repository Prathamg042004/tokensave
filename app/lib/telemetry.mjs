// Keep error stacks and route identity, but omit request material that can hold BYOK credentials.
export function redactEvent(event) {
  if (event.request) {
    event.request = {
      method: event.request.method,
      url:
        typeof event.request.url === "string"
          ? event.request.url.split(/[?#]/, 1)[0]
          : undefined,
    };
  }
  delete event.breadcrumbs;
  delete event.extra;
  return event;
}
