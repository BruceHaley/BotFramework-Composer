// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx, css, CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import React, { useRef, useMemo, useEffect } from 'react';
import isEqual from 'lodash/isEqual';
import formatMessage from 'format-message';
import { DialogFactory, MicrosoftIDialog, SchemaDefinitions } from '@bfc/shared';
import { useShellApi, JSONSchema7, FlowUISchema, FlowWidget } from '@bfc/extension-client';
import { MarqueeSelection } from '@fluentui/react/lib/MarqueeSelection';

import { NodeEventTypes } from '../adaptive-flow-renderer/constants/NodeEventTypes';
import { AdaptiveDialog } from '../adaptive-flow-renderer/adaptive/AdaptiveDialog';

import { NodeRendererContext, NodeRendererContextValue } from './contexts/NodeRendererContext';
import { SelfHostContext } from './contexts/SelfHostContext';
import { getCustomSchema } from './utils/getCustomSchema';
import { SelectionContext } from './contexts/SelectionContext';
import { enableKeyboardCommandAttributes, KeyboardCommandHandler } from './components/KeyboardZone';
import { mapKeyboardCommandToEditorEvent } from './utils/mapKeyboardCommandToEditorEvent';
import { useSelectionEffect } from './hooks/useSelectionEffect';
import { useEditorEventApi } from './hooks/useEditorEventApi';
import {
  VisualEditorNodeMenu,
  VisualEditorEdgeMenu,
  VisualEditorNodeWrapper,
  VisualEditorElementWrapper,
} from './renderers';
import { useFlowUIOptions } from './hooks/useFlowUIOptions';
import { FlowToolbar } from './components/FlowToolbar';

formatMessage.setup({
  missingTranslation: 'ignore',
});

const emotionCache = createCache({
  key: 'adaptive-form-cache',
  // @ts-expect-error
  nonce: window.__nonce__,
});

const styles = css`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

  border: 1px solid transparent;

  &:focus {
    outline: none;
    border-color: black;
  }
`;

export interface VisualDesignerProps {
  onFocus?: (event: React.FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLDivElement>) => void;
  schema?: JSONSchema7;
  data?: any;
}
const VisualDesigner: React.FC<VisualDesignerProps> = ({ onFocus, onBlur, schema, data: inputData }): JSX.Element => {
  const { shellApi, ...shellData } = useShellApi();
  const { schema: schemaFromPlugins, widgets: widgetsFromPlugins } = useFlowUIOptions();
  const {
    dialogId,
    focusedEvent,
    focusedActions,
    focusedTab,
    clipboardActions,
    hosted,
    schemas,
    flowZoomRate,
    flowCommentsVisible,
    topics,
    dialogs,
  } = shellData;

  const { updateFlowZoomRate, toggleFlowComments } = shellApi;

  const dataCache = useRef({});

  /**
   * VisualDesigner is coupled with ShellApi where input json always mutates.
   * Deep checking input data here to make React change detection works.
   */
  const dataChanged = !isEqual(dataCache.current, inputData);
  if (dataChanged) {
    dataCache.current = inputData;
  }

  const data = dataCache.current as MicrosoftIDialog;
  const focusedId = Array.isArray(focusedActions) && focusedActions[0] ? focusedActions[0] : '';

  // Compute schema diff
  const customActionSchema = useMemo(() => getCustomSchema(schemas?.default, schemas?.sdk?.content).actions, [
    schemas?.sdk?.content,
    schemas?.default,
  ]);

  const nodeContext: NodeRendererContextValue = {
    focusedId,
    focusedEvent,
    focusedTab,
    clipboardActions: clipboardActions || [],
    dialogFactory: new DialogFactory(schema),
    customSchemas: customActionSchema ? [customActionSchema] : [],
    topics,
    dialogs,
  };

  const customFlowSchema: FlowUISchema = nodeContext.customSchemas.reduce((result, s) => {
    const definitionKeys = Object.keys(s.definitions ?? {});
    definitionKeys.forEach(($kind) => {
      result[$kind] = {
        widget: 'ActionHeader',
        colors: { theme: '#69797E', color: 'white' },
      } as FlowWidget;
    });
    return result;
  }, {} as FlowUISchema);

  const divRef = useRef<HTMLDivElement>(null);
  // send focus to the keyboard area when navigating to a new trigger
  useEffect(() => {
    divRef.current?.focus();
  }, [focusedEvent]);

  const { selection, ...selectionContext } = useSelectionEffect({ data, nodeContext }, shellApi);
  const { handleEditorEvent } = useEditorEventApi({ path: dialogId, data, nodeContext, selectionContext }, shellApi);

  const handleCommand: KeyboardCommandHandler = (command) => {
    const editorEvent = mapKeyboardCommandToEditorEvent(command);
    editorEvent && handleEditorEvent(editorEvent.type, editorEvent.payload);
  };

  const marqueeStyles = (_) => {
    return {
      root: {
        width: '100%',
        height: '100%',
      },
    };
  };
  return (
    <CacheProvider value={emotionCache}>
      <NodeRendererContext.Provider value={nodeContext}>
        <SelfHostContext.Provider value={hosted}>
          <div
            ref={divRef}
            css={styles}
            tabIndex={0}
            onBlur={onBlur}
            onFocus={onFocus}
            {...enableKeyboardCommandAttributes(handleCommand)}
            data-testid="visualdesigner-container"
          >
            <SelectionContext.Provider value={selectionContext}>
              <MarqueeSelection isDraggingConstrainedToRoot selection={selection} styles={marqueeStyles}>
                <FlowToolbar
                  flowCommentsVisible={flowCommentsVisible}
                  flowZoomRate={flowZoomRate}
                  focusedId={focusedId}
                  toggleFlowComments={toggleFlowComments}
                  updateFlowZoomRate={updateFlowZoomRate}
                >
                  <div
                    className="flow-editor-container"
                    css={{
                      width: '100%',
                      height: '100%',
                      padding: '48px 20px',
                      boxSizing: 'border-box',
                    }}
                    data-testid="flow-editor-container"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditorEvent(NodeEventTypes.Focus, { id: '' });
                    }}
                  >
                    <AdaptiveDialog
                      activeTrigger={focusedEvent}
                      dialogData={data}
                      dialogId={dialogId}
                      renderers={{
                        EdgeMenu: VisualEditorEdgeMenu,
                        NodeMenu: VisualEditorNodeMenu,
                        NodeWrapper: VisualEditorNodeWrapper,
                        ElementWrapper: VisualEditorElementWrapper,
                      }}
                      sdkschema={schema?.definitions as SchemaDefinitions}
                      uischema={{ ...customFlowSchema, ...schemaFromPlugins }}
                      widgets={widgetsFromPlugins}
                      onEvent={(eventName, eventData) => {
                        divRef.current?.focus({ preventScroll: true });
                        handleEditorEvent(eventName, eventData);
                      }}
                    />
                  </div>
                </FlowToolbar>
              </MarqueeSelection>
            </SelectionContext.Provider>
          </div>
        </SelfHostContext.Provider>
      </NodeRendererContext.Provider>
    </CacheProvider>
  );
};

export default VisualDesigner;
