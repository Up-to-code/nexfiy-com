import jsep from "jsep";

export const FORMULA_VERSION = 1;

export type FormulaRuntimeValue =
  string | number | boolean | null | FormulaRuntimeValue[];

type FormulaNode =
  | { type: "literal"; value: string | number | boolean | null }
  | { type: "property"; propertyId: string }
  | { type: "array"; elements: FormulaNode[] }
  | {
      type: "unary";
      operator: "!" | "+" | "-";
      argument: FormulaNode;
    }
  | {
      type: "binary";
      operator:
        | "+"
        | "-"
        | "*"
        | "/"
        | "%"
        | "**"
        | "=="
        | "!="
        | "==="
        | "!=="
        | ">"
        | ">="
        | "<"
        | "<="
        | "&&"
        | "||";
      left: FormulaNode;
      right: FormulaNode;
    }
  | {
      type: "conditional";
      test: FormulaNode;
      consequent: FormulaNode;
      alternate: FormulaNode;
    }
  | {
      type: "call";
      name:
        | "if"
        | "empty"
        | "concat"
        | "round"
        | "floor"
        | "ceil"
        | "abs"
        | "min"
        | "max"
        | "length"
        | "lower"
        | "upper";
      args: FormulaNode[];
    };

type FormulaProperty = {
  id: string;
  name: string;
};

const BINARY_OPERATORS = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "**",
  "==",
  "!=",
  "===",
  "!==",
  ">",
  ">=",
  "<",
  "<=",
  "&&",
  "||",
]);

const FUNCTIONS = new Set([
  "if",
  "empty",
  "concat",
  "round",
  "floor",
  "ceil",
  "abs",
  "min",
  "max",
  "length",
  "lower",
  "upper",
]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Formula contains an invalid expression node");
  }
  return value as Record<string, unknown>;
}

export function compileFormulaExpression(
  expression: string,
  properties: FormulaProperty[],
) {
  const source = expression.trim();
  if (!source || source.length > 2_000) {
    throw new Error("Formula must contain 1 to 2,000 characters");
  }
  let parsed: unknown;
  try {
    parsed = jsep(source);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Invalid formula: ${error.message}`
        : "Invalid formula",
    );
  }

  const propertiesById = new Map(
    properties.map((property) => [property.id, property]),
  );
  const propertiesByName = new Map<string, FormulaProperty[]>();
  for (const property of properties) {
    const key = property.name.toLocaleLowerCase();
    propertiesByName.set(key, [...(propertiesByName.get(key) ?? []), property]);
  }
  const dependencies = new Set<string>();
  let nodeCount = 0;

  const compileNode = (input: unknown, depth: number): FormulaNode => {
    nodeCount += 1;
    if (nodeCount > 200 || depth > 40) {
      throw new Error("Formula is too complex");
    }
    const node = asRecord(input);
    if (node.type === "Literal") {
      if (
        node.value !== null &&
        typeof node.value !== "string" &&
        typeof node.value !== "number" &&
        typeof node.value !== "boolean"
      ) {
        throw new Error("Formula literals must be text, numbers, or booleans");
      }
      return {
        type: "literal",
        value: node.value as string | number | boolean | null,
      };
    }
    if (node.type === "Identifier") {
      if (node.name === "PI") return { type: "literal", value: Math.PI };
      if (node.name === "E") return { type: "literal", value: Math.E };
      throw new Error(`Unknown formula identifier: ${String(node.name)}`);
    }
    if (node.type === "ArrayExpression") {
      if (!Array.isArray(node.elements))
        throw new Error("Invalid formula array");
      return {
        type: "array",
        elements: node.elements.map((element) =>
          compileNode(element, depth + 1),
        ),
      };
    }
    if (node.type === "UnaryExpression") {
      if (!["!", "+", "-"].includes(String(node.operator))) {
        throw new Error(`Unsupported unary operator: ${String(node.operator)}`);
      }
      return {
        type: "unary",
        operator: node.operator as "!" | "+" | "-",
        argument: compileNode(node.argument, depth + 1),
      };
    }
    if (node.type === "BinaryExpression") {
      if (!BINARY_OPERATORS.has(String(node.operator))) {
        throw new Error(
          `Unsupported formula operator: ${String(node.operator)}`,
        );
      }
      return {
        type: "binary",
        operator: node.operator as Extract<
          FormulaNode,
          { type: "binary" }
        >["operator"],
        left: compileNode(node.left, depth + 1),
        right: compileNode(node.right, depth + 1),
      };
    }
    if (node.type === "ConditionalExpression") {
      return {
        type: "conditional",
        test: compileNode(node.test, depth + 1),
        consequent: compileNode(node.consequent, depth + 1),
        alternate: compileNode(node.alternate, depth + 1),
      };
    }
    if (node.type === "CallExpression") {
      const callee = asRecord(node.callee);
      if (callee.type !== "Identifier" || typeof callee.name !== "string") {
        throw new Error("Formula calls must use a supported function name");
      }
      const args = Array.isArray(node.arguments) ? node.arguments : [];
      if (callee.name === "prop") {
        if (args.length !== 1)
          throw new Error("prop() accepts exactly one property");
        const argument = asRecord(args[0]);
        if (argument.type !== "Literal" || typeof argument.value !== "string") {
          throw new Error(
            'prop() requires a property name, for example prop("Capacity")',
          );
        }
        const reference = argument.value.trim();
        const byId = propertiesById.get(reference);
        const byName =
          propertiesByName.get(reference.toLocaleLowerCase()) ?? [];
        const property = byId ?? (byName.length === 1 ? byName[0] : undefined);
        if (!property) {
          throw new Error(
            byName.length > 1
              ? `Property name is ambiguous: ${reference}`
              : `Property not found: ${reference}`,
          );
        }
        dependencies.add(property.id);
        return { type: "property", propertyId: property.id };
      }
      if (!FUNCTIONS.has(callee.name)) {
        throw new Error(`Unsupported formula function: ${callee.name}`);
      }
      return {
        type: "call",
        name: callee.name as Extract<FormulaNode, { type: "call" }>["name"],
        args: args.map((argument) => compileNode(argument, depth + 1)),
      };
    }
    throw new Error(`Unsupported formula syntax: ${String(node.type)}`);
  };

  const canonicalAst = compileNode(parsed, 0);
  return {
    version: FORMULA_VERSION,
    astJson: JSON.stringify(canonicalAst),
    dependencyPropertyIds: [...dependencies],
  };
}

export function formatFormulaExpressionFromAst(
  astJson: string,
  properties: FormulaProperty[],
) {
  const namesById = new Map(
    properties.map((property) => [property.id, property.name]),
  );
  let root: FormulaNode;
  try {
    root = JSON.parse(astJson) as FormulaNode;
  } catch {
    throw new Error("Formula contains an invalid canonical AST");
  }
  let nodeCount = 0;
  const format = (node: FormulaNode, depth: number): string => {
    nodeCount += 1;
    if (nodeCount > 200 || depth > 40 || !node || typeof node !== "object") {
      throw new Error("Formula is too complex");
    }
    if (node.type === "literal") return JSON.stringify(node.value);
    if (node.type === "property") {
      const propertyName = namesById.get(node.propertyId);
      if (!propertyName) {
        throw new Error("Formula references a property that is unavailable");
      }
      return `prop(${JSON.stringify(propertyName)})`;
    }
    if (node.type === "array") {
      return `[${node.elements.map((item) => format(item, depth + 1)).join(", ")}]`;
    }
    if (node.type === "unary") {
      if (!["!", "+", "-"].includes(node.operator)) {
        throw new Error("Formula contains an invalid unary operator");
      }
      return `(${node.operator}${format(node.argument, depth + 1)})`;
    }
    if (node.type === "binary") {
      if (!BINARY_OPERATORS.has(node.operator)) {
        throw new Error("Formula contains an invalid binary operator");
      }
      return `(${format(node.left, depth + 1)} ${node.operator} ${format(node.right, depth + 1)})`;
    }
    if (node.type === "conditional") {
      return `(${format(node.test, depth + 1)} ? ${format(node.consequent, depth + 1)} : ${format(node.alternate, depth + 1)})`;
    }
    if (node.type === "call") {
      if (!FUNCTIONS.has(node.name)) {
        throw new Error("Formula contains an unsupported function");
      }
      return `${node.name}(${node.args.map((item) => format(item, depth + 1)).join(", ")})`;
    }
    throw new Error("Formula contains an invalid canonical AST node");
  };
  return format(root, 0);
}

function numeric(value: FormulaRuntimeValue) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Formula expected a number");
  }
  return value;
}

function scalar(value: FormulaRuntimeValue) {
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

export function evaluateFormulaAst(
  astJson: string,
  resolveProperty: (propertyId: string) => FormulaRuntimeValue,
): FormulaRuntimeValue {
  try {
    const root = JSON.parse(astJson) as FormulaNode;
    let nodeCount = 0;
    const evaluate = (
      node: FormulaNode,
      depth: number,
    ): FormulaRuntimeValue => {
      nodeCount += 1;
      if (nodeCount > 200 || depth > 40)
        throw new Error("Formula is too complex");
      if (node.type === "literal") return node.value;
      if (node.type === "property") return resolveProperty(node.propertyId);
      if (node.type === "array") {
        return node.elements.map((element) => evaluate(element, depth + 1));
      }
      if (node.type === "unary") {
        const value = evaluate(node.argument, depth + 1);
        if (node.operator === "!") return !value;
        return node.operator === "+" ? numeric(value) : -numeric(value);
      }
      if (node.type === "conditional") {
        return evaluate(node.test, depth + 1)
          ? evaluate(node.consequent, depth + 1)
          : evaluate(node.alternate, depth + 1);
      }
      if (node.type === "binary") {
        if (node.operator === "&&") {
          const left = evaluate(node.left, depth + 1);
          return left ? evaluate(node.right, depth + 1) : left;
        }
        if (node.operator === "||") {
          const left = evaluate(node.left, depth + 1);
          return left ? left : evaluate(node.right, depth + 1);
        }
        const left = scalar(evaluate(node.left, depth + 1));
        const right = scalar(evaluate(node.right, depth + 1));
        if (node.operator === "+") {
          if (typeof left === "string" || typeof right === "string") {
            return `${left ?? ""}${right ?? ""}`;
          }
          return numeric(left) + numeric(right);
        }
        if (node.operator === "-") return numeric(left) - numeric(right);
        if (node.operator === "*") return numeric(left) * numeric(right);
        if (node.operator === "/") return numeric(left) / numeric(right);
        if (node.operator === "%") return numeric(left) % numeric(right);
        if (node.operator === "**") return numeric(left) ** numeric(right);
        if (node.operator === "==" || node.operator === "===")
          return left === right;
        if (node.operator === "!=" || node.operator === "!==")
          return left !== right;
        if (node.operator === ">")
          return left !== null && right !== null && left > right;
        if (node.operator === ">=")
          return left !== null && right !== null && left >= right;
        if (node.operator === "<")
          return left !== null && right !== null && left < right;
        return left !== null && right !== null && left <= right;
      }
      const args = node.args.map((argument) => evaluate(argument, depth + 1));
      if (node.name === "if")
        return args[0] ? (args[1] ?? null) : (args[2] ?? null);
      if (node.name === "empty") {
        const value = args[0];
        return (
          value === null ||
          value === "" ||
          (Array.isArray(value) && !value.length)
        );
      }
      if (node.name === "concat")
        return args.map((value) => scalar(value) ?? "").join("");
      if (node.name === "length") {
        const value = args[0];
        return Array.isArray(value) || typeof value === "string"
          ? value.length
          : 0;
      }
      if (node.name === "lower")
        return String(scalar(args[0] ?? "") ?? "").toLowerCase();
      if (node.name === "upper")
        return String(scalar(args[0] ?? "") ?? "").toUpperCase();
      if (node.name === "round") {
        const digits = args[1] === undefined ? 0 : numeric(args[1]);
        const factor = 10 ** Math.max(0, Math.min(10, Math.trunc(digits)));
        return Math.round(numeric(args[0]) * factor) / factor;
      }
      if (node.name === "floor") return Math.floor(numeric(args[0]));
      if (node.name === "ceil") return Math.ceil(numeric(args[0]));
      if (node.name === "abs") return Math.abs(numeric(args[0]));
      const numbers = args.flatMap((value) =>
        Array.isArray(value) ? value.map(numeric) : [numeric(value)],
      );
      return node.name === "min" ? Math.min(...numbers) : Math.max(...numbers);
    };
    const result = evaluate(root, 0);
    if (typeof result === "number" && !Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}
