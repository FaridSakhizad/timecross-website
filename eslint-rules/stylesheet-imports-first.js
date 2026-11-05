/**
 * Stylesheet imports (`import './style.css';`) come before all other imports. Their position
 * decides the order of rules in the bundled stylesheet, so they are kept in one visible place
 * instead of being sorted with the rest (import-x/order leaves side-effect imports alone).
 */
const isStylesheetImport = (node) => (
  node.type === 'ImportDeclaration'
  && node.specifiers.length === 0
  && /\.css$/.test(node.source.value)
);

export default {
  meta: {
    type: 'layout',
    docs: { description: 'Require stylesheet imports before all other imports.' },
    schema: [],
    messages: {
      stylesheetAfterImport: 'Import stylesheets before all other imports.',
    },
  },
  create(context) {
    return {
      Program(program) {
        let hasOtherImport = false;

        program.body.forEach((node) => {
          if (node.type !== 'ImportDeclaration') {
            return;
          }

          if (!isStylesheetImport(node)) {
            hasOtherImport = true;
            return;
          }

          if (hasOtherImport) {
            context.report({ node, messageId: 'stylesheetAfterImport' });
          }
        });
      },
    };
  },
};
