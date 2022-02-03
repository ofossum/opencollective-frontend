import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { graphql } from '@apollo/client/react/hoc';
import css from '@styled-system/css';
import { uniqBy } from 'lodash';
import memoizeOne from 'memoize-one';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import styled from 'styled-components';

import { generateNotFoundError } from '../lib/errors';
import { API_V2_CONTEXT } from '../lib/graphql/helpers';

import AuthenticatedPage from '../components/AuthenticatedPage';
import Avatar from '../components/Avatar';
import CollectiveNavbar from '../components/collective-navbar';
import { Dimensions } from '../components/collective-page/_constants';
import SectionTitle from '../components/collective-page/SectionTitle';
import Container from '../components/Container';
import ErrorPage from '../components/ErrorPage';
import { Box, Grid } from '../components/Grid';
import Link from '../components/Link';
import Loading from '../components/Loading';
import { recurringContributionsQuery } from '../components/recurring-contributions/graphql/queries';
import RecurringContributionsContainer from '../components/recurring-contributions/RecurringContributionsContainer';
import SignInOrJoinFree from '../components/SignInOrJoinFree';
import StyledFilters from '../components/StyledFilters';
import StyledTag from '../components/StyledTag';
import { P, Span } from '../components/Text';
import { withUser } from '../components/UserProvider';

const MainContainer = styled(Container)`
  max-width: ${Dimensions.MAX_SECTION_WIDTH}px;
  margin: 0 auto;
`;

const FILTERS = {
  ACTIVE: 'ACTIVE',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
  CANCELLED: 'CANCELLED',
};

const I18nFilters = defineMessages({
  [FILTERS.ACTIVE]: {
    id: 'Subscriptions.Active',
    defaultMessage: 'Active',
  },
  [FILTERS.MONTHLY]: {
    id: 'Frequency.Monthly',
    defaultMessage: 'Monthly',
  },
  [FILTERS.YEARLY]: {
    id: 'Frequency.Yearly',
    defaultMessage: 'Yearly',
  },
  [FILTERS.CANCELLED]: {
    id: 'Subscriptions.Cancelled',
    defaultMessage: 'Cancelled',
  },
});

const MenuEntry = styled(Link)`
  display: flex;
  align-items: center;
  background: white;
  padding: 16px;
  cursor: pointer;
  background: none;
  color: inherit;
  border: none;
  font: inherit;
  outline: inherit;
  width: 100%;
  text-align: left;

  ${props =>
    props.$isActive &&
    css({
      fontWeight: 800,
      bgColor: 'primary.500',
    })}

  &:hover {
    background: #f9f9f9;
  }
`;

class recurringContributionsPage extends React.Component {
  static getInitialProps({ query: { slug } }) {
    return { slug };
  }

  static propTypes = {
    slug: PropTypes.string,
    loadingLoggedInUser: PropTypes.bool,
    LoggedInUser: PropTypes.object,
    data: PropTypes.shape({
      loading: PropTypes.bool,
      error: PropTypes.any,
      account: PropTypes.object,
    }), // from withData
    intl: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = { filter: 'ACTIVE' };
  }

  getAdministratedAccounts = memoizeOne(loggedInUser => {
    return uniqBy(
      loggedInUser?.memberOf?.filter(m => m.role === 'ADMIN' && !m.collective.isIncognito),
      'collective.id',
    );
  });

  render() {
    const { slug, data, intl, loadingLoggedInUser, LoggedInUser } = this.props;

    const filters = ['ACTIVE', 'MONTHLY', 'YEARLY', 'CANCELLED'];

    if (!data?.loading && !loadingLoggedInUser && LoggedInUser) {
      if (!data || data.error) {
        return <ErrorPage data={data} />;
      } else if (!data.account) {
        return <ErrorPage error={generateNotFoundError(slug)} log={false} />;
      }
    }

    const collective = data && data.account;
    const canEditCollective = LoggedInUser && LoggedInUser.canEditCollective(collective);
    const recurringContributions = collective && collective.orders;
    const adminOf = this.getAdministratedAccounts(LoggedInUser);
    return (
      <AuthenticatedPage>
        {data?.loading || loadingLoggedInUser ? (
          <Container py={[5, 6]}>
            <Loading />
          </Container>
        ) : (
          <Fragment>
            {!canEditCollective ? (
              <Container p={4}>
                <P p={2} fontSize="16px" textAlign="center">
                  <FormattedMessage
                    id="RecurringContributions.permissionError"
                    defaultMessage="You need to be logged in as the admin of this account to view this page."
                  />
                </P>
                <SignInOrJoinFree />
              </Container>
            ) : (
              <Container>
                <CollectiveNavbar collective={collective} />
                <MainContainer py={[3, 4]} px={[2, 3, 4]}>
                  <SectionTitle textAlign="left" mb={1}>
                    <FormattedMessage id="Subscriptions.Title" defaultMessage="Recurring contributions" />
                  </SectionTitle>
                  <Grid gridTemplateColumns={['1fr', '250px 1fr']} gridGap={32} mt={4}>
                    <div>
                      <MenuEntry href="/recurring-contributions" $isActive={!slug} onClick={() => {}}>
                        <Avatar collective={LoggedInUser.collective} size={32} />
                        <Span ml={3}>
                          <FormattedMessage id="ContributionFlow.PersonalProfile" defaultMessage="Personal profile" />
                        </Span>
                      </MenuEntry>
                      {adminOf.map(m => (
                        <MenuEntry
                          key={m.id}
                          href={`/${m.collective.slug}/recurring-contributions`}
                          title={m.collective.name}
                          $isActive={slug === m.collective.slug}
                        >
                          <Avatar collective={m.collective} size={32} />
                          <Span ml={3} truncateOverflow>
                            {m.collective.name}
                          </Span>
                          <StyledTag ml={2} borderRadius={32}>
                            {Math.floor(Math.random() * 13)}
                          </StyledTag>
                        </MenuEntry>
                      ))}
                    </div>
                    <Box>
                      <Box mx="auto">
                        <StyledFilters
                          filters={filters}
                          getLabel={key => intl.formatMessage(I18nFilters[key])}
                          selected={this.state.filter}
                          justifyContent="left"
                          minButtonWidth={175}
                          onChange={filter => this.setState({ filter: filter })}
                        />
                      </Box>
                      <RecurringContributionsContainer
                        recurringContributions={recurringContributions}
                        account={collective}
                        filter={this.state.filter}
                      />
                    </Box>
                  </Grid>
                </MainContainer>
              </Container>
            )}
          </Fragment>
        )}
      </AuthenticatedPage>
    );
  }
}

const addRecurringContributionsPageData = graphql(recurringContributionsQuery, {
  skip: props => !props.LoggedInUser,
  options: props => ({
    context: API_V2_CONTEXT,
    variables: {
      // If slug is passed in the URL (e.g. /facebook/recurring-contributions), use it.
      // Otherwise, use the slug of the LoggedInUser.
      slug: props.slug || props.LoggedInUser?.collective?.slug,
    },
  }),
});

export default withUser(injectIntl(addRecurringContributionsPageData(recurringContributionsPage)));
