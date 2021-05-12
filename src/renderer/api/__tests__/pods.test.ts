/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { Pod } from "../endpoints";

interface GetDummyPodOptions {
  running?: number;
  dead?: number;
  initRunning?: number;
  initDead?: number;
}

function getDummyPodDefaultOptions(): Required<GetDummyPodOptions> {
  return {
    running: 0,
    dead: 0,
    initDead: 0,
    initRunning: 0,
  };
}

function getDummyPod(opts: GetDummyPodOptions = getDummyPodDefaultOptions()): Pod {
  const pod = new Pod({
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      uid: "1",
      name: "test",
      resourceVersion: "v1",
      selfLink: "http"
    }
  });

  pod.spec = {
    containers: [],
    initContainers: [],
    serviceAccount: "dummy",
    serviceAccountName: "dummy",
  };

  pod.status = {
    phase: "Running",
    conditions: [],
    hostIP: "10.0.0.1",
    podIP: "10.0.0.1",
    startTime: "now",
    containerStatuses: [],
    initContainerStatuses: [],
  };

  for (let i = 0; i < opts.running; i += 1) {
    const name = `container_r_${i}`;

    pod.spec.containers.push({
      image: "dummy",
      imagePullPolicy: "dummy",
      name,
    });
    pod.status.containerStatuses.push({
      image: "dummy",
      imageID: "dummy",
      name,
      ready: true,
      restartCount: i,
      state: {
        running: {
          startedAt: "before"
        },
      }
    });
  }

  for (let i = 0; i < opts.dead; i += 1) {
    const name = `container_d_${i}`;

    pod.spec.containers.push({
      image: "dummy",
      imagePullPolicy: "dummy",
      name,
    });
    pod.status.containerStatuses.push({
      image: "dummy",
      imageID: "dummy",
      name,
      ready: false,
      restartCount: i,
      state: {
        terminated: {
          startedAt: "before",
          exitCode: i+1,
          finishedAt: "later",
          reason: `reason_${i}`
        }
      }
    });
  }

  for (let i = 0; i < opts.initRunning; i += 1) {
    const name = `container_ir_${i}`;

    pod.spec.initContainers.push({
      image: "dummy",
      imagePullPolicy: "dummy",
      name,
    });
    pod.status.initContainerStatuses.push({
      image: "dummy",
      imageID: "dummy",
      name,
      ready: true,
      restartCount: i,
      state: {
        running: {
          startedAt: "before"
        }
      }
    });
  }

  for (let i = 0; i < opts.initDead; i += 1) {
    const name = `container_id_${i}`;

    pod.spec.initContainers.push({
      image: "dummy",
      imagePullPolicy: "dummy",
      name,
    });
    pod.status.initContainerStatuses.push({
      image: "dummy",
      imageID: "dummy",
      name,
      ready: false,
      restartCount: i,
      state: {
        terminated: {
          startedAt: "before",
          exitCode: i+1,
          finishedAt: "later",
          reason: `reason_${i}`
        }
      }
    });
  }

  return pod;
}

describe("Pods", () => {
  const podTests = [];

  for (let r = 0; r < 3; r += 1) {
    for (let d = 0; d < 3; d += 1) {
      for (let ir = 0; ir < 3; ir += 1) {
        for (let id = 0; id < 3; id += 1) {
          podTests.push([r, d, ir, id]);
        }
      }
    }
  }

  describe.each(podTests)("for [%d running, %d dead] & initial [%d running, %d dead]", (running, dead, initRunning, initDead) => {
    const pod = getDummyPod({ running, dead, initRunning, initDead });

    function getNamedContainer(name: string) {
      return {
        image: "dummy",
        imagePullPolicy: "dummy",
        name
      };
    }

    it("getRunningContainers should return only running and init running", () => {
      const res = [
        ...Array.from(new Array(running), (val, index) => getNamedContainer(`container_r_${index}`)),
        ...Array.from(new Array(initRunning), (val, index) => getNamedContainer(`container_ir_${index}`)),
      ];

      expect(pod.getRunningContainers()).toStrictEqual(res);
    });

    it("getAllContainers should return all containers", () => {
      const res = [
        ...Array.from(new Array(running), (val, index) => getNamedContainer(`container_r_${index}`)),
        ...Array.from(new Array(dead), (val, index) => getNamedContainer(`container_d_${index}`)),
        ...Array.from(new Array(initRunning), (val, index) => getNamedContainer(`container_ir_${index}`)),
        ...Array.from(new Array(initDead), (val, index) => getNamedContainer(`container_id_${index}`)),
      ];

      expect(pod.getAllContainers()).toStrictEqual(res);
    });

    it("getRestartsCount should return total restart counts", () => {
      function sum(len: number): number {
        let res = 0;

        for (let i = 0; i < len; i += 1) {
          res += i;
        }

        return res;
      }

      expect(pod.getRestartsCount()).toStrictEqual(sum(running) + sum(dead));
    });

    it("hasIssues should return false", () => {
      expect(pod.hasIssues()).toStrictEqual(false);
    });
  });

  describe("getSelectedNodeOs", () => {
    it("should return stable", () => {
      const pod = getDummyPod();

      pod.spec.nodeSelector = {
        "kubernetes.io/os": "foobar"
      };

      expect(pod.getSelectedNodeOs()).toStrictEqual("foobar");
    });

    it("should return beta", () => {
      const pod = getDummyPod();

      pod.spec.nodeSelector = {
        "beta.kubernetes.io/os": "foobar1"
      };

      expect(pod.getSelectedNodeOs()).toStrictEqual("foobar1");
    });

    it("should return stable over beta", () => {
      const pod = getDummyPod();

      pod.spec.nodeSelector = {
        "kubernetes.io/os": "foobar2",
        "beta.kubernetes.io/os": "foobar3"
      };

      expect(pod.getSelectedNodeOs()).toStrictEqual("foobar2");
    });

    it("should return undefined if none set", () => {
      const pod = getDummyPod();

      expect(pod.getSelectedNodeOs()).toStrictEqual(undefined);
    });
  });

  describe("hasIssues", () => {
    it("should return true if a condition isn't ready", () => {
      const pod = getDummyPod({ running: 1 });

      pod.status.conditions.push({
        type: "Ready",
        status: "foobar",
        lastProbeTime: 1,
        lastTransitionTime: "longer ago"
      });

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return false if a condition is non-ready", () => {
      const pod = getDummyPod({ running: 1 });

      pod.status.conditions.push({
        type: "dummy",
        status: "foobar",
        lastProbeTime: 1,
        lastTransitionTime: "longer ago"
      });

      expect(pod.hasIssues()).toStrictEqual(false);
    });

    it("should return true if a current container is in a crash loop back off", () => {
      const pod = getDummyPod({ running: 1 });

      pod.status.containerStatuses[0].state = {
        waiting: {
          reason: "CrashLookBackOff",
          message: "too much foobar"
        }
      };

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return true if a current phase isn't running", () => {
      const pod = getDummyPod({ running: 1 });

      pod.status.phase = "not running";

      expect(pod.hasIssues()).toStrictEqual(true);
    });

    it("should return false if a current phase is running", () => {
      const pod = getDummyPod({ running: 1 });

      pod.status.phase = "Running";

      expect(pod.hasIssues()).toStrictEqual(false);
    });
  });
});
