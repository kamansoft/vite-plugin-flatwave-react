import React from 'react';
import * as ReactRouter from 'react-router-dom';
import type { FlatwaveLanguageRouterProps } from './types.js';
import { FlatwaveLanguageDetector } from './FlatwaveLanguageDetector.js';
import { FlatwaveAppRoutes } from './FlatwaveAppRoutes.js';

const BrowserRouter = ReactRouter.BrowserRouter;

export function FlatwaveLanguageRouter({
  supportedLanguages,
  defaultLanguage,
  onLanguageChange,
  routes,
  renderPage,
  layoutWrapper,
}: FlatwaveLanguageRouterProps): React.ReactElement {
  return (
    <BrowserRouter>
      <FlatwaveLanguageDetector
        supportedLanguages={supportedLanguages}
        defaultLanguage={defaultLanguage}
        onLanguageChange={onLanguageChange}
      >
        <FlatwaveAppRoutes routes={routes} renderPage={renderPage} layoutWrapper={layoutWrapper} />
      </FlatwaveLanguageDetector>
    </BrowserRouter>
  );
}
