import React from 'react';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import { clientStub as lClientStub } from '../../../background/ledger/client';
import walletClient from '../../../utils/walletClient';
import { connect } from 'react-redux';
import * as walletActions from '../../../ducks/walletActions';
import DefaultConnectLedgerSteps from '../../../components/ConnectLedgerStep/defaultSteps';
import './connect.scss';
import {LEDGER_MINIMUM_VERSION} from '../../../constants/ledger';
import semver from 'semver';

const ledgerClient = lClientStub(() => require('electron').ipcRenderer);

// wizard header

@withRouter
@connect((state) => ({
  network: state.wallet.network,
}), (dispatch) => ({
  completeInitialization: (name, passphrase) => dispatch(walletActions.completeInitialization(name, passphrase)),
}))
class ConnectLedger extends React.Component {
  static propTypes = {
    walletName: PropTypes.string.isRequired,
    passphrase: PropTypes.string.isRequired,
    onBack: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    completeInitialization: PropTypes.func.isRequired,
    network: PropTypes.string.isRequired,
  };

  state = {
    isLoading: false,
    isCreating: false,
    errorMessage: null,
  };

  allStepsComplete() {
    const {isLedgerConnected, secretEntered, handshakeSelected} = this.state;
    return isLedgerConnected && secretEntered && handshakeSelected;
  }

  connect = async () => {
    this.setState({
      isLoading: true,
      errorMessage: null,
    });

    let xpub;

    try {
      const appVersion = await ledgerClient.getAppVersion(this.props.network);
      console.log(`HNS Ledger app verison is ${appVersion}, minimum is ${LEDGER_MINIMUM_VERSION}`);
      if (!semver.gte(appVersion, LEDGER_MINIMUM_VERSION)) {
        this.setState({
          isLoading: false,
          isCreating: false,
          errorMessage:
            `Ledger app version ${LEDGER_MINIMUM_VERSION} is required. (${appVersion} installed)`
        });
        return;
      }

      xpub = await ledgerClient.getXPub(this.props.network);
    } catch (e) {
      console.error(e);
      this.setState({
        isLoading: false,
        isCreating: false,
        errorMessage: "Error connecting to device.",
      });
      return;
    }

    this.setState({
      isCreating: true,
    });

    // set a small timeout to clearly show that this is
    // a two-phase process.
    setTimeout(async () => {
      await walletClient.createNewWallet(this.props.walletName, this.props.passphrase, true, xpub);
      await this.props.completeInitialization(this.props.walletName, this.props.passphrase);
      this.props.history.push('/account');
    }, 2000);
  };

  render() {
    const {isCreating} = this.state;

    const {onBack, onCancel} = this.props;
    return (
      <div className="create-password">
        <div className="terms__header">
          <i
            className="arrow left clickable wizard-header__back"
            onClick={onBack}
          />
          <span className="wizard-header__cancel" onClick={onCancel}>
            Cancel
          </span>
        </div>
        <div className="create-password__content">
          <div className="header_text">Connect your Ledger</div>
          <DefaultConnectLedgerSteps completedSteps={[isCreating, isCreating, isCreating]} />
        </div>
        <div
          className={classNames([
            'create-password__footer',
            'create-password__footer__removed-padding-top',
          ])}
        >
          <button
            type="button"
            className="extension_cta_button terms_cta"
            onClick={this.connect}
            disabled={this.state.isLoading}
          >
            {this.state.isLoading ? (this.state.isCreating ? 'Creating wallet...' : 'Connecting...') : 'Connect to Ledger'}
          </button>
        </div>
        <div className="create-password__error-container">
          {this.renderError()}
        </div>
      </div>
    );
  }

  renderError() {
    if (this.state.errorMessage) {
      return (
        <div className="create-password__error">
          {this.state.errorMessage}
        </div>
      );
    }

    return null;
  }
}

export default ConnectLedger;
