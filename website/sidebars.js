/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

module.exports = {
  docs: [
    'intro',
    'getting-started',
    'whats-new',
    'packages',
    'modeling-data',
    'data-sources',
    'updating-data',
    'querying-data',
    'task-processing',
    'data-flows',
    'coordination',
    'memory-sources'
  ],
  api: [
    {
      type: 'category',
      label: 'API Reference',
      items: [
        {
          type: 'autogenerated',
          dirName: 'api'
        }
      ]
    }
  ]
};
