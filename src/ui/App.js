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

import React from 'react';
import Game from './Game';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import TouchBackend from 'react-dnd-touch-backend';

const multiBackends = (...backendFactories) =>
  function(manager) {
    const backends = backendFactories.map(b => b(manager));
    return {
      setup: (...args) =>
        backends.forEach(b => b.setup.apply(b, args)),
      teardown: (...args) =>
        backends.forEach(b => b.teardown.apply(b, args)),
      connectDropTarget: (...args) =>
        backends.forEach(b => b.connectDropTarget.apply(b, args)),
      connectDragPreview: (...args) =>
        backends.forEach(b => b.connectDragPreview.apply(b, args)),
      connectDragSource: (...args) =>
        backends.forEach(b => b.connectDragSource.apply(b, args)),
    };
  };

function App() {
  return (
    <main>
      <DndProvider backend={multiBackends(HTML5Backend, TouchBackend)}>
        <Game />
      </DndProvider>
    </main>
  );
}

export default App;
