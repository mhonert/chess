/*
 * A free and open source chess game using AssemblyScript and React
 * Copyright (C) 2020 mhonert (https://github.com/mhonert)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import styled from 'styled-components/macro';
import React from 'react';

/* Animated spinner adapted from https://loading.io/css/ */
const Spinner = styled.div`
  color: #073642;
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
  
  margin-top: 1rem;
  margin-right: 0.5rem;
  margin-left: 1.5rem;
  
  div {
    transform-origin: 40px 40px;
    animation: lds-spinner 1.2s linear infinite;
  }
  div:after {
    content: " ";
    display: block;
    position: absolute;
    top: 3px;
    left: 37px;
    width: 6px;
    height: 18px;
    border-radius: 20%;
    background: #073642;
  }
  div:nth-child(1) {
    transform: rotate(0deg);
    animation-delay: -1.1s;
  }
  div:nth-child(2) {
    transform: rotate(30deg);
    animation-delay: -1s;
  }
  div:nth-child(3) {
    transform: rotate(60deg);
    animation-delay: -0.9s;
  }
  div:nth-child(4) {
    transform: rotate(90deg);
    animation-delay: -0.8s;
  }
  div:nth-child(5) {
    transform: rotate(120deg);
    animation-delay: -0.7s;
  }
  div:nth-child(6) {
    transform: rotate(150deg);
    animation-delay: -0.6s;
  }
  div:nth-child(7) {
    transform: rotate(180deg);
    animation-delay: -0.5s;
  }
  div:nth-child(8) {
    transform: rotate(210deg);
    animation-delay: -0.4s;
  }
  div:nth-child(9) {
    transform: rotate(240deg);
    animation-delay: -0.3s;
  }
  div:nth-child(10) {
    transform: rotate(270deg);
    animation-delay: -0.2s;
  }
  div:nth-child(11) {
    transform: rotate(300deg);
    animation-delay: -0.1s;
  }
  div:nth-child(12) {
    transform: rotate(330deg);
    animation-delay: 0s;
  }
  @keyframes lds-spinner {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
`

export const AnimatedSpinner = () => (
  <Spinner>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  </Spinner>
);

export default AnimatedSpinner;
