import React from 'react';
import ReactDOM from 'react-dom';
import { Editor } from '@atlaskit/editor-core';
import '@atlaskit/css-reset/dist/bundle.css';

ReactDOM.render(
  <Editor placeholder="editor" appearance="comment"/>,
  document.getElementById('react-root')
);
