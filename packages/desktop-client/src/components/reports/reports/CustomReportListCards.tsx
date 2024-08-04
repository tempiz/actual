import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { send, sendCatch } from 'loot-core/platform/client/fetch/index';
import { addNotification } from 'loot-core/src/client/actions';
import * as monthUtils from 'loot-core/src/shared/months';
import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { useAccounts } from '../../../hooks/useAccounts';
import { useCategories } from '../../../hooks/useCategories';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { usePayees } from '../../../hooks/usePayees';
import { SvgExclamationSolid } from '../../../icons/v1';
import { styles } from '../../../style/index';
import { theme } from '../../../style/theme';
import { Block } from '../../common/Block';
import { InitialFocus } from '../../common/InitialFocus';
import { Input } from '../../common/Input';
import { Text } from '../../common/Text';
import { Tooltip } from '../../common/Tooltip';
import { View } from '../../common/View';
import { NON_DRAGGABLE_AREA_CLASS_NAME } from '../constants';
import { DateRange } from '../DateRange';
import { ReportCard } from '../ReportCard';

import { GetCardData } from './GetCardData';
import { MissingReportCard } from './MissingReportCard';

function calculateHasWarning(
  report: CustomReportEntity,
  {
    categoryIds,
    accountIds,
    payeeIds,
  }: {
    categoryIds: Set<string>;
    accountIds: Set<string>;
    payeeIds: Set<string>;
  },
) {
  if (!report.conditions) {
    return false;
  }

  for (const { field, value } of report.conditions) {
    const strValue = String(value);
    switch (field) {
      case 'account':
        if (!accountIds.has(strValue)) {
          return true;
        }
        break;
      case 'payee':
        if (!payeeIds.has(strValue)) {
          return true;
        }
        break;
      case 'category':
        if (!categoryIds.has(strValue)) {
          return true;
        }
        break;
    }
  }
  return false;
}

type CustomReportListCardsProps = {
  isEditing?: boolean;
  report?: CustomReportEntity;
  onRemove: () => void;
};

export function CustomReportListCards({
  isEditing,
  report,
  onRemove,
}: CustomReportListCardsProps) {
  // It's possible for a dashboard to reference a non-existing
  // custom report
  if (!report) {
    return (
      <MissingReportCard isEditing={isEditing} onRemove={onRemove}>
        This custom report has been deleted.
      </MissingReportCard>
    );
  }

  return (
    <CustomReportListCardsInner
      isEditing={isEditing}
      report={report}
      onRemove={onRemove}
    />
  );
}

function CustomReportListCardsInner({
  isEditing,
  report,
  onRemove,
}: Omit<CustomReportListCardsProps, 'report'> & {
  report: CustomReportEntity;
}) {
  const dispatch = useDispatch();

  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [earliestTransaction, setEarliestTransaction] = useState('');

  const payees = usePayees();
  const accounts = useAccounts();
  const categories = useCategories();

  const categoryIds = new Set(categories.list.map(({ id }) => id));
  const payeeIds = new Set(payees.map(({ id }) => id));
  const accountIds = new Set(accounts.map(({ id }) => id));

  const hasWarning = calculateHasWarning(report, {
    categoryIds,
    payeeIds,
    accountIds,
  });

  const [_firstDayOfWeekIdx] = useLocalPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const onDelete = async () => {
    await send('report/delete', report.id);
  };

  useEffect(() => {
    async function run() {
      const trans = await send('get-earliest-transaction');
      setEarliestTransaction(trans ? trans.date : monthUtils.currentDay());
    }
    run();
  }, []);

  const onSaveName = async (name: string) => {
    const updatedReport = {
      ...report,
      name,
    };

    const response = await sendCatch('report/update', updatedReport);

    if (response.error) {
      dispatch(
        addNotification({
          type: 'error',
          message: `Failed saving report name: ${response.error.message}`,
        }),
      );
      setNameMenuOpen(true);
      return;
    }

    setNameMenuOpen(false);
  };

  return (
    <ReportCard
      isEditing={isEditing}
      to="/reports/custom"
      report={report}
      menuItems={[
        {
          name: 'rename',
          text: 'Rename',
        },
        {
          name: 'remove',
          text: 'Remove',
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'remove':
            onDelete();
            onRemove();
            break;
          case 'rename':
            setNameMenuOpen(true);
            break;
        }
      }}
    >
      <View style={{ flex: 1, padding: 10 }}>
        <View
          style={{
            flexShrink: 0,
            paddingBottom: 5,
          }}
        >
          <View style={{ flex: 1 }}>
            {nameMenuOpen ? (
              <InitialFocus>
                <Input
                  className={NON_DRAGGABLE_AREA_CLASS_NAME}
                  defaultValue={report.name}
                  onEnter={e =>
                    onSaveName((e.target as HTMLInputElement).value)
                  }
                  onBlur={e => onSaveName(e.target.value)}
                  onEscape={() => setNameMenuOpen(false)}
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    marginTop: -6,
                    marginBottom: -1,
                    marginLeft: -6,
                    width: Math.max(20, report.name.length) + 'ch',
                  }}
                />
              </InitialFocus>
            ) : (
              <Block
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                }}
                role="heading"
              >
                {report.name}
              </Block>
            )}
            {report.isDateStatic ? (
              <DateRange start={report.startDate} end={report.endDate} />
            ) : (
              <Text style={{ color: theme.pageTextSubdued }}>
                {report.dateRange}
              </Text>
            )}
          </View>
        </View>
        <GetCardData
          report={report}
          payees={payees}
          accounts={accounts}
          categories={categories}
          earliestTransaction={earliestTransaction}
          firstDayOfWeekIdx={firstDayOfWeekIdx}
        />
      </View>
      {hasWarning && (
        <View style={{ float: 'left', padding: 5 }}>
          <Tooltip
            content="The widget is configured to use a non-existing filter value (i.e. category/account/payee). Edit the filters used in this report widget to remove the warning."
            placement="bottom start"
            style={{ ...styles.tooltip, maxWidth: 300 }}
          >
            <SvgExclamationSolid
              width={20}
              height={20}
              style={{ color: theme.warningText }}
            />
          </Tooltip>
        </View>
      )}
    </ReportCard>
  );
}
