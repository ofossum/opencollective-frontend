import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, isNil } from 'lodash';
import { withRouter } from 'next/router';
import { FormattedMessage, useIntl } from 'react-intl';

import { canContributeRecurring, hostIsTaxDeductibeInTheUs } from '../../lib/collective.lib';
import INTERVALS from '../../lib/constants/intervals';
import { AmountTypes, TierTypes } from '../../lib/constants/tiers-types';
import { formatCurrency } from '../../lib/currency-utils';
import { i18nInterval } from '../../lib/i18n/interval';
import { getTierMinAmount, getTierPresets } from '../../lib/tier-utils';

import StyledButtonSet from '../../components/StyledButtonSet';
import StyledInputAmount from '../../components/StyledInputAmount';
import StyledInputField from '../../components/StyledInputField';

import FormattedMoneyAmount from '../FormattedMoneyAmount';
import { Box, Flex } from '../Grid';
import StyledAmountPicker, { OTHER_AMOUNT_KEY } from '../StyledAmountPicker';
import StyledHr from '../StyledHr';
import StyledInput from '../StyledInput';
import { H5, P, Span } from '../Text';
import { useUser } from '../UserProvider';

import ChangeTierWarningModal from './ChangeTierWarningModal';
import PlatformTipInput from './PlatformTipInput';
import TierCustomFields from './TierCustomFields';
import { getTotalAmount } from './utils';

const getCustomFields = (collective, tier) => {
  return [...(tier?.customFields || []), ...(collective.host?.settings?.contributionFlow?.customFields || [])];
};

const StepDetails = ({ onChange, data, collective, tier, showFeesOnTop, router, isEmbed }) => {
  const intl = useIntl();
  const amount = data?.amount;
  const getDefaultOtherAmountSelected = () => isNil(amount) || !presets?.includes(amount);
  const presets = React.useMemo(() => getTierPresets(tier, collective.type), [tier, collective.type]);
  const [isOtherAmountSelected, setOtherAmountSelected] = React.useState(getDefaultOtherAmountSelected);
  const [temporaryInterval, setTemporaryInterval] = React.useState(undefined);
  const minAmount = getTierMinAmount(tier);
  const hasQuantity = tier?.type === TierTypes.TICKET || tier?.type === TierTypes.PRODUCT;
  const isFixedContribution = tier?.amountType === AmountTypes.FIXED;
  const { LoggedInUser } = useUser();
  const customFields = getCustomFields(collective, tier);
  const currency = tier?.amount.currency || collective.currency;
  const selectedInterval = data?.interval !== INTERVALS.flexible ? data?.interval : null;
  const supportsRecurring = canContributeRecurring(collective, LoggedInUser) && (!tier || tier?.interval);
  const isFixedInterval = tier?.interval && tier.interval !== INTERVALS.flexible;

  const dispatchChange = (field, value) => {
    onChange({ stepDetails: { ...data, [field]: value }, stepSummary: null });
  };

  // If an interval has been set (either from the tier defaults, or form an URL param) and the
  // collective doesn't support it, we reset the interval
  React.useEffect(() => {
    if (selectedInterval && !isFixedInterval && !supportsRecurring) {
      dispatchChange('interval', null);
    }
  }, [selectedInterval, isFixedInterval, supportsRecurring]);

  return (
    <Box width={1}>
      {!isFixedInterval && supportsRecurring && (
        <StyledButtonSet
          id="interval"
          justifyContent="center"
          mt={[4, 0]}
          mb="30px"
          items={[null, INTERVALS.month, INTERVALS.year]}
          selected={selectedInterval || null}
          buttonProps={{ px: 2, py: '5px' }}
          role="group"
          aria-label="Amount types"
          onChange={interval => {
            if (tier && tier.interval !== INTERVALS.flexible) {
              setTemporaryInterval(interval);
            } else {
              dispatchChange('interval', interval);
            }
          }}
        >
          {({ item, isSelected }) => (
            <Span fontSize={isSelected ? '20px' : '18px'} lineHeight="28px" fontWeight={isSelected ? 500 : 400}>
              {i18nInterval(intl, item || INTERVALS.oneTime)}
            </Span>
          )}
        </StyledButtonSet>
      )}

      {!isFixedContribution ? (
        <Box mb="30px">
          <StyledAmountPicker
            currency={currency}
            presets={presets}
            value={isOtherAmountSelected ? OTHER_AMOUNT_KEY : data?.amount}
            onChange={value => {
              if (value === OTHER_AMOUNT_KEY) {
                setOtherAmountSelected(true);
              } else {
                setOtherAmountSelected(false);
                dispatchChange('amount', value);
              }
            }}
          />
          {isOtherAmountSelected && (
            <Flex justifyContent="space-between" alignItems="center" mt={2}>
              <StyledInputAmount
                name="custom-amount"
                type="number"
                currency={currency}
                value={data?.amount}
                width={1}
                min={minAmount}
                currencyDisplay="full"
                prependProps={{ color: 'black.500' }}
                required
                onChange={value => {
                  dispatchChange('amount', value);
                }}
              />
              {Boolean(minAmount) && (
                <Flex fontSize="14px" color="black.800" flexDirection="column" alignItems="flex-end" mt={1}>
                  <FormattedMessage
                    id="contribution.minimumAmount"
                    defaultMessage="Minimum amount: {minAmount} {currency}"
                    values={{
                      minAmount: formatCurrency(minAmount, currency, { locale: intl.locale }),
                      currency,
                    }}
                  />
                </Flex>
              )}
            </Flex>
          )}
        </Box>
      ) : tier.amount.valueInCents ? (
        <Box mb={3}>
          <FormattedMessage
            id="contribute.tierDetails"
            defaultMessage="You’ll contribute {amount}{interval, select, month { monthly} year { yearly} other {}}."
            values={{
              interval: tier.interval ?? '',
              amount: <FormattedMoneyAmount amount={getTotalAmount(data)} currency={currency} />,
            }}
          />
        </Box>
      ) : !hasQuantity ? (
        <FormattedMessage id="contribute.freeTier" defaultMessage="This is a free tier." />
      ) : null}

      {hasQuantity && (
        <Box mb="30px">
          <StyledInputField
            htmlFor="quantity"
            label={<FormattedMessage id="contribution.quantity" defaultMessage="Quantity" />}
            labelFontSize="16px"
            labelColor="black.800"
            labelProps={{ fontWeight: 500, lineHeight: '28px', mb: 1 }}
            error={Boolean(tier.availableQuantity !== null && data?.quantity > tier.availableQuantity)}
            data-cy="contribution-quantity"
            required
          >
            {fieldProps => (
              <div>
                {tier.availableQuantity !== null && (
                  <P
                    fontSize="11px"
                    color="#e69900"
                    textTransform="uppercase"
                    fontWeight="500"
                    letterSpacing="1px"
                    mb={2}
                  >
                    <FormattedMessage
                      id="tier.limited"
                      defaultMessage="LIMITED: {availableQuantity} LEFT OUT OF {maxQuantity}"
                      values={tier}
                    />
                  </P>
                )}
                <StyledInput
                  {...fieldProps}
                  type="number"
                  min={1}
                  step={1}
                  max={tier.availableQuantity}
                  value={data?.quantity}
                  maxWidth={80}
                  onChange={e => dispatchChange('quantity', parseInt(e.target.value))}
                  fontSize="15px"
                  minWidth={100}
                />
              </div>
            )}
          </StyledInputField>
        </Box>
      )}
      {hostIsTaxDeductibeInTheUs(collective.host) && (
        <React.Fragment>
          <StyledHr borderColor="black.300" mb={16} mt={32} />
          <P fontSize="14px" lineHeight="20px" fontStyle="italic" color="black.500" letterSpacing="0em">
            <FormattedMessage
              id="platformFee.taxDeductible"
              defaultMessage="This Collective's Fiscal Host is a registered 501(c)(3) non-profit organization. Your contribution will be tax-deductible in the US, to the extent allowed by the law."
            />
          </P>
          <StyledHr borderColor="black.300" mt={16} mb={32} />
        </React.Fragment>
      )}
      {showFeesOnTop && (
        <Box mt={28}>
          <PlatformTipInput
            currency={currency}
            amount={data?.amount}
            fees={data?.platformContribution}
            interval={data?.interval}
            quantity={data?.quantity}
            onChange={value => dispatchChange('platformContribution', value)}
            isEmbed={isEmbed}
          />
        </Box>
      )}
      {!isEmpty(customFields) && (
        <Box mt={28}>
          <H5 fontSize="20px" fontWeight="normal" color="black.800">
            <FormattedMessage id="OtherInfo" defaultMessage="Other information" />
          </H5>
          <TierCustomFields
            fields={customFields}
            data={data?.customData}
            onChange={customData => dispatchChange('customData', customData)}
          />
        </Box>
      )}
      {temporaryInterval !== undefined && (
        <ChangeTierWarningModal
          tierName={tier.name}
          onClose={() => setTemporaryInterval(undefined)}
          onConfirm={() => {
            dispatchChange('interval', temporaryInterval);
            setTemporaryInterval(undefined);
            router.push(`/${collective.slug}/donate/details`);
          }}
        />
      )}
    </Box>
  );
};

StepDetails.propTypes = {
  onChange: PropTypes.func,
  showFeesOnTop: PropTypes.bool,
  isEmbed: PropTypes.bool,
  LoggedInUser: PropTypes.object,
  data: PropTypes.shape({
    amount: PropTypes.number,
    platformContribution: PropTypes.number,
    quantity: PropTypes.number,
    interval: PropTypes.string,
    customData: PropTypes.object,
  }),
  collective: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    currency: PropTypes.string.isRequired,
    type: PropTypes.string,
    host: PropTypes.object,
  }).isRequired,
  tier: PropTypes.shape({
    amountType: PropTypes.string,
    interval: PropTypes.string,
    name: PropTypes.string,
    maxQuantity: PropTypes.number,
    availableQuantity: PropTypes.number,
    type: PropTypes.oneOf(Object.values(TierTypes)),
    customFields: PropTypes.array,
    amount: PropTypes.shape({
      currency: PropTypes.string,
      valueInCents: PropTypes.number,
    }),
    minAmount: PropTypes.shape({
      valueInCents: PropTypes.number,
    }),
  }),
  router: PropTypes.object,
};

export default withRouter(StepDetails);
