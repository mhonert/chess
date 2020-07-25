# A free and open source chess game using AssemblyScript and React
# Copyright (C) 2020 mhonert (https://github.com/mhonert)
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

from dataclasses import dataclass
import logging as log
import yaml
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from time import time
import sys
import os
from typing import List, Dict
import os.path
import copy


# Uses "Texel's Tuning Method" for tuning evaluation parameters
# see https://www.chessprogramming.org/Texel%27s_Tuning_Method for a detailed description of the method


# Scaling factor (calculated for Wasabi Chess engine)
K = 1.342224


@dataclass
class TestPosition:
    fen: str
    result: float
    score: int = 0


@dataclass
class TuningOption:
    name: str
    value: int
    is_part: bool = False
    orig_name: str = ""
    steps: int = 16  # 4 ^ n (e.g. 1/4/16/64/...)
    direction: int = 1
    improvements: int = 0
    iterations: int = 0
    remaining_skips: int = 0  # Skip this option for 'remaining_skips' iterations
    skip_count: int = 0  # How many times this option has already been skipped


# Read test positions in format: FEN result
# result may be "1-0" for a white win, "0-1" for a black win or "1/2" for a draw
def read_fens(fen_file) -> List[TestPosition]:
    test_positions = []
    with open(fen_file, 'r') as file:

        # Sample line:
        # rnbqkb1r/1p2ppp1/p2p1n2/2pP3p/4P3/5N2/PPP1QPPP/RNB1KB1R w KQkq - 0 1 1-0
        for line in file:
            fen = line[:-5]
            result_str = line[-4:].strip()
            result = 1 if result_str == "1-0" else 0 if result_str == "0-1" else 0.5
            test_positions.append(TestPosition(fen, result))

    return test_positions


class Engine:
    def __init__(self, engine_cmd):
        self.process = subprocess.Popen([engine_cmd], bufsize=1, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                        stderr=subprocess.STDOUT, universal_newlines=True)

    def stop(self):
        log.debug("Stopping engine instance")
        self.process.communicate("quit\n", timeout=2)

        self.process.kill()
        self.process.communicate()

    def send_command(self, cmd):
        log.debug(">>> " + cmd)
        self.process.stdin.write(cmd + "\n")

    def wait_for_command(self, cmd):
        for line in self.process.stdout:
            line = line.rstrip()
            log.debug("<<< " + line)
            if cmd in line:
                return line


def run_engine(engine: Engine, tuning_options: List[TuningOption], test_positions: List[TestPosition]):
    results = []

    try:
        engine.send_command("uci")
        engine.wait_for_command("uciok")

        for option in tuning_options:
            engine.send_command("setoption name {} value {}".format(option.name, option.value))

        engine.send_command("isready")
        engine.wait_for_command("readyok")

        for chunk in make_chunks(test_positions, 100):
            fens = "eval "
            is_first = True
            for pos in chunk:
                if not is_first:
                    fens += ";"
                fens += pos.fen
                is_first = False

            engine.send_command(fens)

            result = engine.wait_for_command("scores")

            scores = [int(score) for score in result[len("scores "):].split(";")]
            assert len(scores) == len(chunk)

            for i in range(len(scores)):
                chunk[i].score = scores[i]

    except subprocess.TimeoutExpired as error:
        engine.stop()
        raise error

    except Exception as error:
        log.error(str(error))

    return results


# Split list of test positions into "batch_count" batches
def make_batches(positions: List[TestPosition], batch_count: int) -> List[List[TestPosition]]:
    max_length = len(positions)
    batch_size = max(1, max_length // batch_count)
    return make_chunks(positions, batch_size)


# Split list of test positions into chunks of size "chunk_size"
def make_chunks(positions: List[TestPosition], chunk_size: int) -> List[List[TestPosition]]:
    max_length = len(positions)
    for i in range(0, max_length, chunk_size):
        yield positions[i:min(i + chunk_size, max_length)]


def get_config(cfg: Dict, key: str, msg: str):
    value = cfg.get(key)
    if value is None:
        sys.exit(msg)
    return value


@dataclass
class Config:
    engine_cmd: str
    debug_log: bool
    test_positions_file: str
    concurrent_workers: int
    tuning_optins: List[TuningOption]

    def __init__(self, config_file: str):
        log.info("Reading configuration ...")

        cfg_stream = open(config_file, "r")

        cfg = yaml.safe_load(cfg_stream)
        engine_cfg = get_config(cfg, "engine", "Missing 'engine' configuration")

        self.engine_cmd = get_config(engine_cfg, "cmd", "Missing 'engine > cmd' configuration")

        options = get_config(cfg, "options", "Missing 'options' configuration")

        self.debug_log = bool(options.get("debug_log", False))

        self.test_positions_file = get_config(options, "test_positions_file",
                                              "Missing 'options.test_positions_file' configuration")

        self.concurrent_workers = int(options.get("concurrency", 1))
        if self.concurrent_workers <= 0:
            sys.exit("Invalid value for 'options > concurrency': " + options.get("concurrency"))
        log.info("- use %i concurrent engine processes", self.concurrent_workers)

        if self.concurrent_workers >= os.cpu_count():
            log.warning("Configured 'options > concurrency' to be >= the number of logical CPU cores")
            log.info("It is recommended to set concurrency to the number of physical CPU cores - 1")

        tuning_cfg = cfg.get('tuning')
        self.tuning_options = []
        if tuning_cfg is not None:
            for t in tuning_cfg:
                value = t["value"]
                if type(value) is list:
                    for index, v in enumerate(value):
                        option = TuningOption(t["name"] + str(index), int(v), True, t["name"])
                        self.tuning_options.append(option)

                else:
                    option = TuningOption(t["name"], int(value))
                    self.tuning_options.append(option)

        cfg_stream.close()


def run_pass(config: Config, k: float, engines: List[Engine], test_positions: List[TestPosition]) -> float:
    futures = []

    log.debug("Starting pass")

    with ThreadPoolExecutor(max_workers=config.concurrent_workers) as executor:
        worker_id = 1
        for batch in make_batches(test_positions, config.concurrent_workers):
            engine = engines[worker_id - 1]
            futures.append(executor.submit(run_engine, engine, worker_id, config.tuning_options, batch))
            worker_id += 1

        for future in as_completed(futures):
            if future.cancelled():
                sys.exit("Worker was cancelled - possible engine bug? try enabling the debug_log output and re-run the 'tunomat'")

    log.debug("Pass completed")

    e = calc_avg_error(k, test_positions)

    return e


def calc_avg_error(k: float, positions: List[TestPosition]) -> float:
    errors = .0
    for pos in positions:
        win_probability = 1.0 / (1.0 + 10.0 ** (-pos.score * k / 400.0))
        error = pos.result - win_probability
        error *= error
        errors += error
    return errors / float(len(positions))


def write_options(options: List[TuningOption]):
    results = []
    result_by_name = {}
    for option in options:
        if option.is_part:
            if option.orig_name in result_by_name:
                result_by_name[option.orig_name]["value"].append(option.value)
            else:
                result = {"name": option.orig_name, "value": [option.value]}
                results.append(result)
                result_by_name[option.orig_name] = result

        else:
            results.append({"name": option.name, "value": option.value})

    with open("tuning_result.yml", "w") as file:
        yaml.dump(results, file, sort_keys=True, indent=4)


def main():
    log.basicConfig(stream=sys.stdout, level=log.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

    config = Config("config.yml")
    if config.debug_log:
        log.getLogger().setLevel(log.DEBUG)

    log.info("Reading test positions ...")

    test_positions = read_fens(config.test_positions_file)
    log.info("Read %i test positions", len(test_positions))

    # Start multiple engines
    engines = []
    for i in range(config.concurrent_workers + 1):
        engine = Engine(config.engine_cmd)
        engines.append(engine)

    try:

        best_err = run_pass(config, K, engines, test_positions)
        init_err = best_err
        log.info("Starting err: %f", init_err)
        best_options = copy.deepcopy(config.tuning_options)

        tick = time()

        retry_postponed = False
        improved = True
        while improved:
            improved = False
            config.tuning_options = best_options
            write_options(best_options)
            for i in range(len(config.tuning_options)):
                option = config.tuning_options[i]
                option.iterations += 1
                best_options[i].iterations = option.iterations
                if option.remaining_skips > 0:
                    option.remaining_skips -= 1
                    best_options[i].remaining_skips = option.remaining_skips
                    continue

                prev_value = option.value
                option.value = prev_value + option.steps * option.direction
                new_err = run_pass(config, K, engines, test_positions)
                log.info("Try %s = %d [step %d] => %f", option.name, option.value, option.steps * option.direction, new_err - best_err)
                if new_err < best_err:
                    best_err = new_err
                    option.improvements += 1
                    option.skip_count = 0
                    best_options = copy.deepcopy(config.tuning_options)
                    log.info("Improvement: %f", best_err)
                    improved = True
                else:
                    option.value = prev_value + option.steps * -option.direction
                    new_err = run_pass(config, K, engines, test_positions)
                    log.info("Try %s = %d [step %d] => %f", option.name, option.value, option.steps * -option.direction, new_err - best_err)
                    if new_err < best_err:
                        best_err = new_err
                        option.direction = -option.direction
                        option.improvements += 1
                        option.skip_count = 0
                        best_options = copy.deepcopy(config.tuning_options)
                        log.info("Improvement: %f", best_err)
                        improved = True
                    else:
                        option.value = prev_value
                        if option.steps > 1:
                            # No improvement at the current 'step' level => decrease step level
                            option.steps >>= 2

                            if option.iterations > 1 and option.improvements == 0:
                                option.steps = 1

                            best_options[i].steps = option.steps

                        else:
                            # No improvement at smallest 'step' level => skip this option for a couple iterations
                            option.skip_count += 1
                            option.remaining_skips += 8 * option.skip_count
                            best_options[i].remaining_skips = option.remaining_skips
                            best_options[i].skip_count = option.skip_count

            if not improved and not retry_postponed:
                log.info("No improvement => check postponed options")
                retry_postponed = True
                any_postponed = False
                for option in best_options:
                    option.steps = 1
                    if option.remaining_skips > 0:
                        option.remaining_skips = 0
                        any_postponed = True

                improved = any_postponed
            else:
                retry_postponed = False

        log.info("Avg. error before tuning: %f", init_err)
        log.info("Avg. error after tuning : %f", best_err)
        log.info("Tuning duration         : %.2fs", time() - tick)

        write_options(best_options)

    finally:
        for engine in engines:
            engine.stop()


# Main
if __name__ == "__main__":
    main()
