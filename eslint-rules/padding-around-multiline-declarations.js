/**
 * Multiline functions stored in variables (`const handleClick = () => { ... };`) and multiline
 * type declarations are separated from their neighbours by blank lines, the same way function
 * declarations are. One-line declarations and other multiline constants (objects, useMemo calls)
 * may stay grouped with the declarations around them.
 */
const FUNCTION_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression']);
const TYPE_DECLARATION_TYPES = new Set(['TSTypeAliasDeclaration', 'TSInterfaceDeclaration']);

const isMultiline = (node) => node.loc.start.line !== node.loc.end.line;

function isPaddedDeclaration(statement) {
  const node = statement?.type === 'ExportNamedDeclaration' ? statement.declaration : statement;

  if (!node) {
    return false;
  }

  if (TYPE_DECLARATION_TYPES.has(node.type)) {
    return isMultiline(node);
  }

  if (node.type !== 'VariableDeclaration' || node.declarations.length !== 1) {
    return false;
  }

  const { init } = node.declarations[0];

  return Boolean(init && FUNCTION_TYPES.has(init.type) && isMultiline(init));
}

/** The statement's first line, including comments written right above it. */
function getStartLine(sourceCode, node) {
  const [firstComment] = sourceCode.getCommentsBefore(node);

  return (firstComment ?? node).loc.start.line;
}

/** The last token on the statement's last line, including a trailing comment. */
function getEndToken(sourceCode, node) {
  let token = sourceCode.getLastToken(node);
  let next = sourceCode.getTokenAfter(token, { includeComments: true });

  while (next && next.loc.start.line === token.loc.end.line && next.type !== 'Punctuator') {
    token = next;
    next = sourceCode.getTokenAfter(token, { includeComments: true });
  }

  return token;
}

export default {
  meta: {
    type: 'layout',
    docs: { description: 'Require blank lines around multiline function constants and type declarations.' },
    fixable: 'whitespace',
    schema: [],
    messages: {
      before: 'Expected a blank line before this declaration.',
      after: 'Expected a blank line after this declaration.',
    },
  },
  create(context) {
    const { sourceCode } = context;

    function checkPair(previous, next, functionNode, messageId) {
      const previousEnd = getEndToken(sourceCode, previous);

      if (getStartLine(sourceCode, next) - previousEnd.loc.end.line > 1) {
        return;
      }

      context.report({
        node: functionNode,
        messageId,
        fix: (fixer) => fixer.insertTextAfter(previousEnd, '\n'),
      });
    }

    function checkStatements(statements) {
      statements.forEach((statement, index) => {
        if (!isPaddedDeclaration(statement)) {
          return;
        }

        const previous = statements[index - 1];
        const next = statements[index + 1];

        if (previous) {
          checkPair(previous, statement, statement, 'before');
        }

        if (next) {
          checkPair(statement, next, statement, 'after');
        }
      });
    }

    return {
      Program: (node) => checkStatements(node.body),
      BlockStatement: (node) => checkStatements(node.body),
      StaticBlock: (node) => checkStatements(node.body),
      SwitchCase: (node) => checkStatements(node.consequent),
    };
  },
};
