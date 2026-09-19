export function submitEcpayTopLevelForm(
  checkoutUrl: string,
  fields: Record<string, string>,
): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  form.target = "_top";
  form.setAttribute("accept-charset", "UTF-8");

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}

export function parseCheckoutFields(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const fields: Record<string, string> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (typeof fieldValue !== "string") {
      return null;
    }
    fields[key] = fieldValue;
  }
  return fields;
}
