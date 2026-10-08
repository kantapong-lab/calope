// Dependency-free JSON Schema (draft-07 subset) validator.
// Supports: type, enum, const, required, properties, additionalProperties, items,
// minItems, maxItems, minLength, maxLength, minimum, maximum, pattern, allOf, if/then.
export function validate(schema, data, path = '$') {
  const errs = [];
  const err = (m) => errs.push(`${path}: ${m}`);
  const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);

  if (schema.const !== undefined && JSON.stringify(schema.const) !== JSON.stringify(data)) err(`must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(data))) err(`must be one of ${JSON.stringify(schema.enum)}, got ${JSON.stringify(data)}`);
  if (schema.type) {
    const t = typeOf(data);
    const ok = schema.type === t || (schema.type === 'number' && t === 'integer');
    if (!ok) { err(`expected ${schema.type}, got ${t}`); return errs; }
  }
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) err(`shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && data.length > schema.maxLength) err(`longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) err(`does not match /${schema.pattern}/ (got "${data}")`);
  }
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) err(`< ${schema.minimum}`);
    if (schema.maximum !== undefined && data > schema.maximum) err(`> ${schema.maximum}`);
  }
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) err(`needs at least ${schema.minItems} item(s)`);
    if (schema.maxItems !== undefined && data.length > schema.maxItems) err(`at most ${schema.maxItems} item(s)`);
    if (schema.items) data.forEach((d, i) => errs.push(...validate(schema.items, d, `${path}[${i}]`)));
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const k of schema.required ?? []) if (!(k in data)) err(`missing required "${k}"`);
    const props = schema.properties ?? {};
    for (const [k, v] of Object.entries(data)) {
      if (props[k]) errs.push(...validate(props[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) err(`unexpected property "${k}"`);
    }
  }
  for (const sub of schema.allOf ?? []) errs.push(...validate(sub, data, path));
  if (schema.if && validate(schema.if, data, path).length === 0 && schema.then) errs.push(...validate(schema.then, data, path));
  return errs;
}
