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

import "./cluster-overview.scss";

import React from "react";
import { reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { ClusterStore, getHostedCluster } from "../../../common/cluster-store";
import { interval } from "../../utils";
import { TabLayout } from "../layout/tab-layout";
import { Spinner } from "../spinner";
import { ClusterIssues } from "./cluster-issues";
import { ClusterMetrics } from "./cluster-metrics";
import { ClusterPieCharts } from "./cluster-pie-charts";
import { ResourceType } from "../cluster-settings/components/cluster-metrics-setting";
import { clusterApi, nodesApi, podsApi } from "../../api/endpoints";
import type { NodesStore } from "../+nodes";
import type { PodsStore } from "../+workloads-pods";
import { ApiManager } from "../../api/api-manager";
import type { ClusterObjectStore } from "./cluster-overview.store";

@observer
export class ClusterOverview extends React.Component {
  private get nodesStore() {
    return ApiManager.getInstance().getStore<NodesStore>(nodesApi);
  }

  private get podsStore() {
    return ApiManager.getInstance().getStore<PodsStore>(podsApi);
  }

  private get clusterObjectStore() {
    return ApiManager.getInstance().getStore<ClusterObjectStore>(clusterApi);
  }

  private metricPoller = interval(60, () => this.loadMetrics());

  loadMetrics() {
    getHostedCluster().available && this.clusterObjectStore.loadMetrics();
  }

  componentDidMount() {
    this.metricPoller.start(true);

    disposeOnUnmount(this, [
      reaction(
        () => this.clusterObjectStore.metricNodeRole, // Toggle Master/Worker node switcher
        () => this.metricPoller.restart(true)
      ),
    ]);
  }

  componentWillUnmount() {
    this.metricPoller.stop();
  }

  renderMetrics(isMetricsHidden: boolean) {
    if (isMetricsHidden) {
      return null;
    }

    return (
      <>
        <ClusterMetrics/>
        <ClusterPieCharts/>
      </>
    );
  }

  renderClusterOverview(isLoaded: boolean, isMetricsHidden: boolean) {
    if (!isLoaded) {
      return <Spinner center/>;
    }

    return (
      <>
        {this.renderMetrics(isMetricsHidden)}
        <ClusterIssues className={isMetricsHidden ? "OnlyClusterIssues" : ""}/>
      </>
    );
  }

  render() {
    const isLoaded = this.nodesStore.isLoaded && this.podsStore.isLoaded;
    const isMetricsHidden = ClusterStore.getInstance().isMetricHidden(ResourceType.Cluster);

    return (
      <TabLayout>
        <div className="ClusterOverview">
          {this.renderClusterOverview(isLoaded, isMetricsHidden)}
        </div>
      </TabLayout>
    );
  }
}
