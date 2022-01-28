import React from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@apollo/client';
import { get } from 'lodash';
import { FormattedMessage } from 'react-intl';

import { API_V2_CONTEXT, gqlV2 } from '../../../lib/graphql/helpers';

import SectionContribute from '../../collective-page/sections/Contribute.js';
import { Box, Flex, Grid } from '../../Grid';
import Image from '../../Image';
import LoadingPlaceholder from '../../LoadingPlaceholder';
import StyledLink from '../../StyledLink';
import { P, Span, Strong } from '../../Text';
import SettingsTitle from '../SettingsTitle';

// TODO: Make sure this query works with organizations
const tiersQuery = gqlV2/* GraphQL */ `
  query UpdateOrderPopUpTiers($accountSlug: String!) {
    account(slug: $accountSlug) {
      id
      ... on AccountWithContributions {
        tiers {
          nodes {
            id
            name
            slug
            description
            interval
            amount {
              valueInCents
              currency
            }
            minimumAmount {
              valueInCents
              currency
            }
            amountType
            endsAt
            type
            maxQuantity
          }
        }
      }
    }
  }
`;

/**
 * A revamp of `components/edit-collective/sections/Tiers.js`. Meant to be renamed once we'll be ready
 * to replace the old tiers form.
 */
const TiersRevamp = ({ collective }) => {
  const variables = { accountSlug: collective.slug };
  const { data, loading } = useQuery(tiersQuery, { variables, context: API_V2_CONTEXT });
  const tiers = get(data, 'account.tiers.nodes', []);
  return (
    <div>
      <SettingsTitle>
        <FormattedMessage defaultMessage="Contribution tiers" />
      </SettingsTitle>
      <Grid gridTemplateColumns={['1fr', '172px 1fr']} gridGap={62} mt={34}>
        <Box>
          <Image src="/static/images/tiers-graphic.png" alt="" width={172} height={145} layout="fixed" />
        </Box>
        <Box ml={2}>
          <P>
            <Strong>
              <FormattedMessage defaultMessage="About contribution tiers" />
            </Strong>
            <br />
            <br />
            <Span>
              <FormattedMessage defaultMessage="You can provide perks or rewards for your tiers, have a set membership fee, or create categories for your contributors. Tiers can be limited to an amount or frequency (one time, monthly, yearly), or allowed to be flexibly set by contributors." />
            </Span>
          </P>
          <P mt={3}>
            <StyledLink
              href="https://docs.opencollective.com/help/collectives/collective-settings/tiers-goals"
              openInNewTab
            >
              <FormattedMessage defaultMessage="Learn more about tiers" />.
            </StyledLink>
          </P>
        </Box>
      </Grid>
      <Box mt={4}>
        {loading ? <LoadingPlaceholder height={500} width="100%" /> : <SectionContribute collective={data.account} />}
      </Box>
    </div>
  );
};

TiersRevamp.propTypes = {
  collective: PropTypes.shape({
    slug: PropTypes.string.isRequired,
  }).isRequired,
};

export default TiersRevamp;
