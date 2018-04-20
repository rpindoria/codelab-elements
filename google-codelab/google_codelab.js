/**
 * Copyright 2018 Google Inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

goog.module('googlecodelabs.Codelab');

const EventHandler = goog.require('goog.events.EventHandler');
const Templates = goog.require('googlecodelabs.Codelab.Templates');
const Transition = goog.require('goog.fx.css3.Transition');
const TransitionEventType = goog.require('goog.fx.Transition.EventType');
const dom = goog.require('goog.dom');
const events = goog.require('goog.events');
const soy = goog.require('goog.soy');

/** @const {string} */
const TITLE_ATTR = 'title';

/** @const {string} */
const ENVIRONMENT_ATTR = 'environment';

/** @const {string} */
const CATEGORY_ATTR = 'category';

/** @const {string} */
const FEEDBACK_LINK_ATTR = 'feedback-link';

/** @const {string} */
const SELECTED_ATTR = 'selected';

/** @const {string} */
const LAST_UPDATED_ATTR = 'last-updated';

/** @const {string} */
const DURATION_ATTR = 'duration';

/** @const {string} */
const HIDDEN_ATTR = 'hidden';

/** @const {string} */
const COMPLETED_ATTR = 'completed';

/** @const {string} */
const LABEL_ATTR = 'label';

/** @const {string} */
const DONT_SET_HISTORY_ATTR = 'dsh';

/** @const {string} */
const ANIMATING_ATTR = 'animating';

/** @const {number} Page transition time in seconds */
const ANIMATION_DURATION = .5;

/** @const {string} */
const DRAWER_OPEN_ATTR = 'drawer--open';

/**
 * @extends {HTMLElement}
 */
class Codelab extends HTMLElement {

  constructor() {
    super();

    /** @private {?Element} */
    this.drawer_ = null;

    /** @private {?Element} */
    this.stepsContainer_ = null;

    /** @private {?Element} */
    this.titleContainer_ = null;

    /** @private {?Element} */
    this.nextStepBtn_ = null;

    /** @private {?Element} */
    this.prevStepBtn_ = null;

    /** @private {?Element} */
    this.doneBtn_ = null;

    /** @private {!Array<!Element>} */
    this.steps_ = [];

    /** @private {number}  */
    this.currentSelectedStep_ = -1;

    /** @private {!EventHandler} */
    this.eventHandler_ = new EventHandler();

    /** @private {!EventHandler} */
    this.transitionEventHandler_ = new EventHandler();

    /** @private {boolean} */
    this.hasSetup_ = false;

    /** @private {?Transition} */
    this.transitionIn_ = null;

    /** @private {?Transition} */
    this.transitionOut_ = null;
  }
  /**
   * @export
   * @override
   */
  connectedCallback() {
    if (!this.hasSetup_) {
      this.setupDom_();
    }

    this.addEvents_();

    this.showSelectedStep_();
    this.updateTitle_();

    window.requestAnimationFrame(() => {
      document.body.removeAttribute('unresolved');
    });
  }

  /**
   * @export
   * @override
   */
  disconnectedCallback() {
    this.eventHandler_.removeAll();
    this.transitionEventHandler_.removeAll();
  }

  /**
   * @return {!Array<string>}
   * @export
   */
  static get observedAttributes() {
    return [TITLE_ATTR, ENVIRONMENT_ATTR, CATEGORY_ATTR, FEEDBACK_LINK_ATTR,
        SELECTED_ATTR, LAST_UPDATED_ATTR];
  }

  /**
   * @param {string} attr
   * @param {?string} oldValue
   * @param {?string} newValue
   * @param {?string} namespace
   * @export
   * @override
   */
  attributeChangedCallback(attr, oldValue, newValue, namespace) {
    switch (attr) {
      case TITLE_ATTR:
        this.updateTitle_();
        break;
      case SELECTED_ATTR:
        this.showSelectedStep_();
        break;
    }
  }

  addEvents_() {
    if (this.prevStepBtn_) {
      this.eventHandler_.listen(this.prevStepBtn_, events.EventType.CLICK,
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          const step = parseInt(this.getAttribute(SELECTED_ATTR), 10);
          this.setAttribute(SELECTED_ATTR, step - 1);
        });
    }
    if (this.nextStepBtn_) {
      this.eventHandler_.listen(this.nextStepBtn_, events.EventType.CLICK,
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          const step = parseInt(this.getAttribute(SELECTED_ATTR), 10);
          this.setAttribute(SELECTED_ATTR, step + 1);
        });
    }

    if (this.drawer_) {
      this.eventHandler_.listen(this.drawer_, events.EventType.CLICK,
          (e) => this.handleDrawerClick_(e));
    }

    if (this.titleContainer_) {
      const menuBtn = this.titleContainer_.querySelector('#menu');
      if (menuBtn) {
        this.eventHandler_.listen(menuBtn, events.EventType.CLICK, (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.hasAttribute(DRAWER_OPEN_ATTR)) {
            this.removeAttribute(DRAWER_OPEN_ATTR);
          } else {
            this.setAttribute(DRAWER_OPEN_ATTR, '');
          }
        });

        this.eventHandler_.listen(document.body, events.EventType.CLICK, (e) => {
          if (this.hasAttribute(DRAWER_OPEN_ATTR)) {
            this.removeAttribute(DRAWER_OPEN_ATTR);
          }
        });
      }
    }

    this.eventHandler_.listen(window, events.EventType.POPSTATE, (e) => {
      this.handlePopStateChanged_(e);
    });
  }

  /**
   * History popState callback
   * @param {!Event} e
   * @private
   */
  handlePopStateChanged_(e) {
    if (document.location.hash) {
      this.setAttribute(DONT_SET_HISTORY_ATTR, '');
      this.setAttribute(SELECTED_ATTR, document.location.hash.substring(1));
      this.removeAttribute(DONT_SET_HISTORY_ATTR);
    }
  }

   /**
   * Updates the browser history state
   * @param {string} path The new browser state
   * @param {boolean=} replaceState optionally replace state instead of pushing
   * @export
   */
  updateHistoryState(path, replaceState=false) {
    if (replaceState) {
      window.history.replaceState({path}, document.title, path);
    } else {
      window.history.pushState({path}, document.title, path);
    }
  }

  /**
   * @param {!Event} e
   * @private
   */
  handleDrawerClick_(e) {
    e.preventDefault();
    e.stopPropagation();
    let target = /** @type {!Element} */ (e.target);

    while (target !== this.drawer_) {
      if (target.tagName.toUpperCase() === 'A') {
        break;
      }
      target = /** @type {!Element} */ (target.parentNode);
    }

    if (target === this.drawer_) {
      return;
    }

    const selected = target.getAttribute('href').substring(1);
    this.setAttribute(SELECTED_ATTR, selected);
  }

  /**
   * @private
   */
  updateTitle_() {
    const title = this.getAttribute(TITLE_ATTR);
    if (!title || !this.titleContainer_) {
      return;
    }
    const newTitleEl =  soy.renderAsElement(Templates.title, {title});
    document.title = title;
    const oldTitleEl = this.titleContainer_.querySelector('h1');
    const buttons = this.titleContainer_.querySelector('#codelab-nav-buttons');
    if (oldTitleEl) {
      dom.replaceNode(newTitleEl, oldTitleEl);
    } else {
      dom.insertSiblingAfter(newTitleEl, buttons);
    }
  }

  /**
   * @private
   */
  updateTimeRemaining_() {
    if (!this.titleContainer_) {
      return;
    }

    let time = 0;
    for (let i = this.currentSelectedStep_; i < this.steps_.length; i++) {
      const step = /** @type {!Element} */ (this.steps_[i]);
      time += parseInt(step.getAttribute(DURATION_ATTR), 10);
    }

    const newTimeEl =  soy.renderAsElement(Templates.timeRemaining, {time});
    const oldTimeEl = this.titleContainer_.querySelector('#time-remaining');
    if (oldTimeEl) {
      dom.replaceNode(newTimeEl, oldTimeEl);
    } else {
      dom.appendChild(this.titleContainer_, newTimeEl);
    }
  }

  /**
   * @private
   */
  setupSteps_() {
    this.steps_.forEach((step, index) => {
      step = /** @type {!Element} */ (step);
      step.setAttribute('step', index+1);
    });
  }

  /**
   * @private
   */
  showSelectedStep_() {
    let selected = 0;
    if (this.hasAttribute(SELECTED_ATTR)) {
      selected = this.getAttribute(SELECTED_ATTR);
    } else {
      if (document.location.hash) {
        selected = document.location.hash.substring(1);
      }
      this.setAttribute(SELECTED_ATTR, selected);
      return;
    }

    selected = Math.min(Math.max(0, parseInt(selected, 10)), this.steps_.length - 1);

    if (this.currentSelectedStep_ === selected || isNaN(selected)) {
      // Either the current step is already selected or an invalid option was provided
      // do nothing and return.
      return;
    }

    if (this.currentSelectedStep_ === -1) {
      // No previous selected step, so select the correct step with no animation
      this.steps_[selected].setAttribute(SELECTED_ATTR, '');
    } else {
      if (this.transitionIn_) {
        this.transitionIn_.stop();
      }
      if (this.transitionOut_) {
        this.transitionOut_.stop();
      }

      this.transitionEventHandler_.removeAll();

      const transitionInInitialStyle = {};
      const transitionInFinalStyle = {
        transform: 'translate3d(0, 0, 0)'
      };

      const transitionOutInitialStyle = {
        transform: 'translate3d(0, 0, 0)'
      };
      const transitionOutFinalStyle = {};

      const stepToSelect = this.steps_[selected];
      const currentStep = this.steps_[this.currentSelectedStep_];
      stepToSelect.setAttribute(ANIMATING_ATTR, '');

      currentStep.scrollTop = 0;

      if (this.currentSelectedStep_ < selected) {
        // Move new step in from the right
        transitionInInitialStyle['transform'] = 'translate3d(110%, 0, 0)';
        transitionOutFinalStyle['transform'] = 'translate3d(-110%, 0, 0)';
      } else {
        // Move new step in from the left
        transitionInInitialStyle['transform'] = 'translate3d(-110%, 0, 0)';
        transitionOutFinalStyle['transform'] = 'translate3d(110%, 0, 0)';
      }

      const animationProperties = [{
        property: 'transform',
        duration: ANIMATION_DURATION,
        delay: 0,
        timing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }];

      this.transitionIn_ = new Transition(stepToSelect, ANIMATION_DURATION,
          transitionInInitialStyle, transitionInFinalStyle, animationProperties);
      this.transitionOut_ = new Transition(currentStep, ANIMATION_DURATION,
        transitionOutInitialStyle, transitionOutFinalStyle, animationProperties);

      this.transitionIn_.play();
      this.transitionOut_.play();

      this.transitionEventHandler_.listenOnce(this.transitionIn_,
            [TransitionEventType.FINISH, TransitionEventType.STOP], () => {
        stepToSelect.setAttribute(SELECTED_ATTR, '');
        stepToSelect.removeAttribute(ANIMATING_ATTR);
      });

      this.transitionEventHandler_.listenOnce(this.transitionOut_,
            [TransitionEventType.FINISH, TransitionEventType.STOP], () => {
        currentStep.removeAttribute(SELECTED_ATTR);
      });
    }

    this.currentSelectedStep_ = selected;

    if (this.nextStepBtn_ && this.prevStepBtn_ && this.doneBtn_) {
      if (selected === 0) {
        this.prevStepBtn_.setAttribute(HIDDEN_ATTR, '');
      } else {
        this.prevStepBtn_.removeAttribute(HIDDEN_ATTR);
      }
      if (selected === this.steps_.length - 1) {
        this.nextStepBtn_.setAttribute(HIDDEN_ATTR, '');
        this.doneBtn_.removeAttribute(HIDDEN_ATTR);
      } else {
        this.nextStepBtn_.removeAttribute(HIDDEN_ATTR);
        this.doneBtn_.setAttribute(HIDDEN_ATTR, '');
      }
    }

    if (this.drawer_) {
      const steps = this.drawer_.querySelectorAll('li');
      steps.forEach((step, i) => {
        if (i <= selected) {
          step.setAttribute(COMPLETED_ATTR, '');
        } else {
          step.removeAttribute(COMPLETED_ATTR);
        }
        if (i === selected) {
          step.setAttribute(SELECTED_ATTR, '');
        } else {
          step.removeAttribute(SELECTED_ATTR);
        }
      });
    }

    this.updateTimeRemaining_();
    if (!this.hasAttribute(DONT_SET_HISTORY_ATTR)) {
      this.updateHistoryState(`#${selected}`);
    }
  }

  renderDrawer_() {
    const steps = this.steps_.map((step) => step.getAttribute(LABEL_ATTR));
    soy.renderElement(this.drawer_, Templates.drawer, {steps});
  }

  /**
   * @private
   */
  setupDom_() {
    this.steps_ = Array.from(this.querySelectorAll('google-codelab-step'));

    soy.renderElement(this, Templates.structure);
    
    this.drawer_ = this.querySelector('#drawer');
    this.titleContainer_ = this.querySelector('#codelab-title');
    this.stepsContainer_ = this.querySelector('#steps');
    this.prevStepBtn_ = this.querySelector('#fabs #previous-step');
    this.nextStepBtn_ = this.querySelector('#fabs #next-step');
    this.doneBtn_ = this.querySelector('#fabs #done');

    this.steps_.forEach((step) => dom.appendChild(this.stepsContainer_, step));
    this.setupSteps_();
    this.renderDrawer_();

    this.hasSetup_ = true;
  }
}

window.customElements.define('google-codelab', Codelab);

exports = Codelab;