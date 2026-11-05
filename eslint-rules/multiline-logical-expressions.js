/**
 * A logical expression (&&, ||, ??) broken over several lines puts every operand on its own line,
 * with the operator at the start of the line. In an `if` or `while` condition the operands also
 * start on a new line after "(" and the ")" goes on its own line. An expression is "broken" when
 * at least one of its operators starts a line, so `isOpen && (<div>...</div>)` stays as it is:
 *
 *   if (
 *     isOpen
 *     && hasFocus
 *   ) {
 */
function isParenthesized(sourceCode, node) {
  const before = sourceCode.getTokenBefore(node);
  const after = sourceCode.getTokenAfter(node);

  return before?.value === '(' && after?.value === ')';
}

/** True for a part of a longer chain of the same operator (the chain is checked from its top). */
function isChainPart(sourceCode, node) {
  return node.parent.type === 'LogicalExpression'
    && node.parent.operator === node.operator
    && !isParenthesized(sourceCode, node);
}

/** Operands of a chain of the same operator: a && b && c -> [a, b, c]. */
function getOperands(sourceCode, node) {
  const collect = (part) => (
    part.type === 'LogicalExpression' && part.operator === node.operator && !isParenthesized(sourceCode, part)
      ? [...collect(part.left), ...collect(part.right)]
      : [part]
  );

  return [...collect(node.left), ...collect(node.right)];
}

/** The operator tokens between the operands. */
function getOperators(sourceCode, node, operands) {
  return operands.slice(1).map((operand) => (
    sourceCode.getTokenBefore(operand, (token) => token.value === node.operator)
  ));
}

function isBroken(sourceCode, node) {
  const operands = getOperands(sourceCode, node);

  return getOperators(sourceCode, node, operands).some((operator) => (
    sourceCode.getTokenBefore(operator).loc.end.line !== operator.loc.start.line
  ));
}

export default {
  meta: {
    type: 'layout',
    docs: { description: 'Require one operand per line in multiline logical expressions.' },
    fixable: 'whitespace',
    schema: [],
    messages: {
      operand: 'Put each operand of a multiline "{{operator}}" expression on its own line.',
      openingParen: 'Start a multiline condition on a new line after "(".',
      closingParen: 'Put ")" of a multiline condition on its own line.',
    },
  },
  create(context) {
    const { sourceCode } = context;

    function checkOperands(node) {
      const operands = getOperands(sourceCode, node);
      const operators = getOperators(sourceCode, node, operands);

      operators.forEach((operator, index) => {
        const previousToken = sourceCode.getTokenBefore(operator);

        if (previousToken.loc.end.line !== operator.loc.start.line) {
          return;
        }

        context.report({
          node: operands[index + 1],
          messageId: 'operand',
          data: { operator: node.operator },
          fix: (fixer) => fixer.replaceTextRange([previousToken.range[1], operator.range[0]], '\n'),
        });
      });
    }

    function checkCondition(test) {
      if (test?.type !== 'LogicalExpression' || !isBroken(sourceCode, test)) {
        return;
      }

      const openingParen = sourceCode.getTokenBefore(test, (token) => token.value === '(');
      const closingParen = sourceCode.getTokenAfter(test, (token) => token.value === ')');
      const firstToken = sourceCode.getTokenAfter(openingParen);
      const lastToken = sourceCode.getTokenBefore(closingParen);

      if (firstToken.loc.start.line === openingParen.loc.end.line) {
        context.report({
          node: test,
          messageId: 'openingParen',
          fix: (fixer) => fixer.insertTextAfter(openingParen, '\n'),
        });
      }

      if (lastToken.loc.end.line === closingParen.loc.start.line) {
        context.report({
          node: test,
          messageId: 'closingParen',
          fix: (fixer) => fixer.insertTextBefore(closingParen, '\n'),
        });
      }
    }

    return {
      LogicalExpression(node) {
        if (!isChainPart(sourceCode, node) && isBroken(sourceCode, node)) {
          checkOperands(node);
        }
      },
      IfStatement: (node) => checkCondition(node.test),
      WhileStatement: (node) => checkCondition(node.test),
    };
  },
};
