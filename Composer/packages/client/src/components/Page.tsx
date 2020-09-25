// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx, css } from '@emotion/core';
import React from 'react';
import { FontWeights, FontSizes } from 'office-ui-fabric-react/lib/Styling';

import { Toolbar, IToolbarItem } from './Toolbar';
import { NavTree, INavTreeItem } from './NavTree';
import { ProjectTree } from './ProjectTree/ProjectTree';

// -------------------- Styles -------------------- //

export const root = css`
  height: calc(100vh - 50px);
  display: flex;
  flex-direction: row;

  label: Page;
`;

export const pageWrapper = css`
  display: flex;
  flex-direction: column;
  flex-grow: 1;

  label: PageWrapper;
`;

export const header = css`
  padding: 5px 20px;
  height: 60px;
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  align-items: center;

  label: PageHeader;
`;

export const headerTitle = css`
  font-size: ${FontSizes.xLarge};
  font-weight: ${FontWeights.semibold};

  label: PageHeaderTitle;
`;

export const headerContent = css`
  display: flex;
  align-items: center;

  label: PageHeaderContent;
`;

export const main = css`
  margin-left: 2px;
  height: calc(100vh - 165px);
  display: flex;
  border-top: 1px solid #dddddd;
  position: relative;
  nav {
    ul {
      margin-top: 0px;
    }
  }

  label: PageMain;
`;

export const content = css`
  flex: 4;
  padding: 20px;
  position: relative;
  overflow: auto;

  label: PageContent;
`;

// -------------------- Page -------------------- //

interface IPageProps {
  // TODO: add type
  toolbarItems: IToolbarItem[];
  navLinks: INavTreeItem[];
  title: string;
  navRegionName: string;
  mainRegionName: string;
  onRenderHeaderContent?: () => string | JSX.Element | null;
  'data-testid'?: string;
  showDialogs?: boolean;
}

const Page: React.FC<IPageProps> = ({
  title,
  navLinks,
  toolbarItems,
  onRenderHeaderContent,
  children,
  navRegionName,
  mainRegionName,
  showDialogs = true,
  'data-testid': testId,
}) => {
  return (
    <div css={root} data-testid={testId}>
      <div css={pageWrapper}>
        <Toolbar toolbarItems={toolbarItems} />
        <div css={header}>
          <h1 css={headerTitle}>{title}</h1>
          {onRenderHeaderContent && <div css={headerContent}>{onRenderHeaderContent()}</div>}
        </div>
        <div css={main} role="main">
          {/* <NavTree navLinks={navLinks} regionName={navRegionName} /> */}
          <ProjectTree
            selected=""
            selectedDialog=""
            showDialogs={showDialogs}
            showTriggers={false}
            onDelete={(item) => console.log('deleting', item)}
            onSelect={(item) => console.log('selected', item)}
          />
          <div aria-label={mainRegionName} css={content} data-testid="PageContent" role="region">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Page };
