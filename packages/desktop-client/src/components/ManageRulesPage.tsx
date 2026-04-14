import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ManageRules } from './ManageRules';
import { Page } from './Page';

function RulesErrorFallback() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <Text style={{ ...styles.mediumText, color: theme.errorText }}>
        <Trans>There was a problem loading rules</Trans>
      </Text>
    </View>
  );
}

export function ManageRulesPage() {
  const { t } = useTranslation();
  return (
    <ErrorBoundary FallbackComponent={RulesErrorFallback}>
      <Page header={t('Rules')}>
        <ManageRules isModal={false} payeeId={null} />
      </Page>
    </ErrorBoundary>
  );
}
