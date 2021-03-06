var React = require('react');
var ReactDOM = require('react-dom');
var Constants = require('./constants');
var Helpers = require('./helpers');
var merge = require('object-assign');

/* From Modernizr */
var whichTransitionEvent = function() {
  var t;
  var el = document.createElement('fakeelement');
  var transitions = {
    'transition': 'transitionend',
    'OTransition': 'oTransitionEnd',
    'MozTransition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd'
  };

  for (t in transitions) {
    if (el.style[t] !== undefined) {
      return transitions[t];
    }
  }
};

var NotificationItem = React.createClass({

  propTypes: {
    notification: React.PropTypes.object,
    getStyles: React.PropTypes.object,
    onRemove: React.PropTypes.func,
    allowHTML: React.PropTypes.bool,
    noAnimation: React.PropTypes.bool,
    actions: React.PropTypes.array
  },

  getDefaultProps: function() {
    return {
      noAnimation: false,
      onRemove: function() {},
      allowHTML: false
    };
  },

  getInitialState: function() {
    return {
      visible: false,
      removed: false
    };
  },

  componentWillMount: function() {
    var getStyles = this.props.getStyles;
    var level = this.props.notification.level;
    var i = 0;

    this._noAnimation = this.props.noAnimation;

    this._styles = {
      notification: getStyles.byElement('notification')(level),
      title: getStyles.byElement('title')(level),
      dismiss: getStyles.byElement('dismiss')(level),
      messageWrapper: getStyles.byElement('messageWrapper')(level),
      actionWrapper: getStyles.byElement('actionWrapper')(level),
      actions: getStyles.byElement('action')(level)
    };
    if (this.props.notification.actions) {
      for (i = 0; i < this.props.notification.actions.length; i++) {
        this._defaultActions[i] = function(index, event) {
          var notification = this.props.notification;

          event.preventDefault();
          this._hideNotification();
          if (typeof notification.actions[index].callback === 'function') {
            notification.actions[index].callback();
          }
        };
      }
    }

    if (!this.props.notification.dismissible) {
      this._styles.notification.cursor = 'default';
    }
  },

  _styles: {},

  _notificationTimer: null,

  _height: 0,

  _noAnimation: null,

  _isMounted: false,

  _removeCount: 0,

  _getCssPropertyByPosition: function() {
    var position = this.props.notification.position;
    var css = {};

    switch (position) {
    case Constants.positions.tl:
    case Constants.positions.bl:
      css = {
        property: 'left',
        value: -200
      };
      break;

    case Constants.positions.tr:
    case Constants.positions.br:
      css = {
        property: 'right',
        value: -200
      };
      break;

    case Constants.positions.tc:
      css = {
        property: 'top',
        value: -100
      };
      break;

    case Constants.positions.bc:
      css = {
        property: 'bottom',
        value: -100
      };
      break;

    default:
    }

    return css;
  },

  _defaultActions: [],

  _hideNotification: function() {
    if (this._notificationTimer) {
      this._notificationTimer.clear();
    }

    if (this._isMounted) {
      this.setState({
        visible: false,
        removed: true
      });
    }

    if (this._noAnimation) {
      this._removeNotification();
    }
  },

  _removeNotification: function() {
    this.props.onRemove(this.props.notification.uid);
  },

  _dismiss: function() {
    if (!this.props.notification.dismissible) {
      return;
    }

    this._hideNotification();
  },

  _showNotification: function() {
    var self = this;
    setTimeout(function() {
      if (self._isMounted) {
        self.setState({
          visible: true
        });
      }
    }, 50);
  },

  _onTransitionEnd: function() {
    if (this._removeCount > 0) return;
    if (this.state.removed) {
      this._removeCount++;
      this._removeNotification();
    }
  },

  componentDidMount: function() {
    var self = this;
    var transitionEvent = whichTransitionEvent();
    var notification = this.props.notification;
    var element = ReactDOM.findDOMNode(this);

    this._height = element.offsetHeight;

    this._isMounted = true;

    // Watch for transition end
    if (!this._noAnimation) {
      if (transitionEvent) {
        element.addEventListener(transitionEvent, this._onTransitionEnd);
      } else {
        this._noAnimation = true;
      }
    }


    if (notification.autoDismiss) {
      this._notificationTimer = new Helpers.Timer(function() {
        self._hideNotification();
      }, notification.autoDismiss * 1000);
    }

    this._showNotification();
  },

  _handleMouseEnter: function() {
    var notification = this.props.notification;
    if (notification.autoDismiss) {
      this._notificationTimer.pause();
    }
  },

  _handleMouseLeave: function() {
    var notification = this.props.notification;
    if (notification.autoDismiss) {
      this._notificationTimer.resume();
    }
  },

  componentWillUnmount: function() {
    var element = ReactDOM.findDOMNode(this);
    var transitionEvent = whichTransitionEvent();
    element.removeEventListener(transitionEvent, this._onTransitionEnd);
    this._isMounted = false;
  },

  _allowHTML: function(string) {
    return { __html: string };
  },

  render: function() {
    var notification = this.props.notification;
    var className = 'notification notification-' + notification.level;
    var notificationStyle = merge({}, this._styles.notification);
    var cssByPos = this._getCssPropertyByPosition();
    var dismiss = null;
    var actionButtons = [];
    var actionButtonsWrapper = null;
    var title = null;
    var message = null;
    var i = 0;

    if (this.state.visible) {
      className = className + ' notification-visible';
    } else {
      className = className + ' notification-hidden';
    }

    if (!notification.dismissible) {
      className = className + ' notification-not-dismissible';
    }

    if (this.props.getStyles.overrideStyle) {
      if (!this.state.visible && !this.state.removed) {
        notificationStyle[cssByPos.property] = cssByPos.value;
      }

      if (this.state.visible && !this.state.removed) {
        notificationStyle.height = this._height;
        notificationStyle[cssByPos.property] = 0;
      }

      if (this.state.removed) {
        notificationStyle.overlay = 'hidden';
        notificationStyle.height = 0;
        notificationStyle.marginTop = 0;
        notificationStyle.paddingTop = 0;
        notificationStyle.paddingBottom = 0;
      }
      notificationStyle.opacity = this.state.visible ? this._styles.notification.isVisible.opacity : this._styles.notification.isHidden.opacity;
    }

    if (notification.title) {
      title = <h4 className="notification-title" style={ this._styles.title }>{ notification.title }</h4>;
    }

    if (notification.message) {
      if (this.props.allowHTML) {
        message = (
          <div className="notification-message" style={ this._styles.messageWrapper } dangerouslySetInnerHTML={ this._allowHTML(notification.message) }></div>
        );
      } else {
        message = (
          <div className="notification-message" style={ this._styles.messageWrapper }>{ notification.message }</div>
        );
      }
    }

    if (notification.dismissible) {
      dismiss = <span className="notification-dismiss" style={ this._styles.dismiss }>&times;</span>;
    }

    if (notification.actions) {
      for (i = 0; i < notification.actions.length; i++) {
        actionButtons.push(
            <button key={ i } className="notification-action-button"
              onClick={ this._defaultActions[i].bind(this, i) }
              style={ this._styles.actions }>
                { notification.actions[i].label }
            </button>
        );
      }
      actionButtonsWrapper = (
        <div className="notification-action-wrapper" style={ this._styles.actionWrapper }>
          { actionButtons }
        </div>
      );
    }

    return (
      <div className={ className } onClick={ this._dismiss } onMouseEnter={ this._handleMouseEnter } onMouseLeave={ this._handleMouseLeave } style={ notificationStyle }>
        { title }
        { message }
        { dismiss }
        { actionButtonsWrapper }
      </div>
    );
  }

});

module.exports = NotificationItem;
