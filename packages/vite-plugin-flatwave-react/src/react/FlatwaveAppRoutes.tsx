import React from 'react';
import * as ReactRouter from 'react-router-dom';
import type { FlatwaveAppRoutesProps } from './types.js';
import { FlatwaveLanguageContext } from './FlatwaveLanguageContext.js';

const Routes = ReactRouter.Routes;
const Route = ReactRouter.Route;

export function FlatwaveAppRoutes({
  routes: providedRoutes,
  renderPage,
  layoutWrapper,
}: FlatwaveAppRoutesProps): React.ReactElement {
  const context = React.useContext(FlatwaveLanguageContext);
  const locale = context?.locale || '';

  // Use providedRoutes or empty array (caller should provide routes)
  const allRoutes = providedRoutes ?? [];

  // Group routes by locale
  const localeRoutes = allRoutes.filter((r) => r.locale === locale);

  return (
    <Routes>
      {localeRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            layoutWrapper ? (
              <LayoutWrapper wrapper={layoutWrapper} locale={locale}>
                {renderPage(route, locale)}
              </LayoutWrapper>
            ) : (
              renderPage(route, locale)
            )
          }
        />
      ))}
      <Route path="*" element={null} />
    </Routes>
  );
}

function LayoutWrapper({
  wrapper: Wrapper,
  locale,
  children,
}: {
  wrapper: React.ComponentType<{ children: React.ReactNode; locale: string }>;
  locale: string;
  children: React.ReactNode;
}): React.ReactElement {
  return <Wrapper locale={locale}>{children}</Wrapper>;
}

export type { FlatwaveAppRoutesProps } from './types.js';
