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

import React from "react";
import type { Cluster } from "../../../../main/cluster";
//import { FilePicker, OverSizeLimitStyle } from "../../file-picker";
import { boundMethod } from "../../../utils";
import { Button } from "../../button";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { SubTitle } from "../../layout/sub-title";
import { HotbarIcon } from "../../hotbar/hotbar-icon";
import type { KubernetesCluster } from "../../../../common/catalog-entities";
import { FilePicker, OverSizeLimitStyle } from "../../file-picker";

enum GeneralInputStatus {
  CLEAN = "clean",
  ERROR = "error",
}

interface Props {
  cluster: Cluster;
  entity: KubernetesCluster
}

@observer
export class ClusterIconSetting extends React.Component<Props> {
  @observable status = GeneralInputStatus.CLEAN;
  @observable errorText?: string;

  @boundMethod
  async onIconPick([file]: File[]) {
    const { cluster } = this.props;

    try {
      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());

        cluster.preferences.icon = `data:${file.type};base64,${buf.toString("base64")}`;
      } else {
        // this has to be done as a seperate branch (and not always) because `cluster`
        // is observable and triggers an update loop.
        cluster.preferences.icon = undefined;
      }
    } catch (e) {
      this.errorText = e.toString();
      this.status = GeneralInputStatus.ERROR;
    }
  }

  getClearButton() {
    if (this.props.cluster.preferences.icon) {
      return <Button
        label="Clear"
        tooltip="Revert back to default icon"
        onClick={() => this.onIconPick([])}
      />;
    }

    return null;
  }

  render() {
    const { entity } = this.props;
    const label = (
      <>
        <HotbarIcon
          uid={entity.metadata.uid}
          title={entity.metadata.name}
          source={entity.metadata.source}
          icon={entity.spec.iconData}
        />
        <span style={{marginRight: "var(--unit)"}}>Browse for new icon...</span>
      </>
    );

    return (
      <>
        <SubTitle title="Cluster Icon" />
        <div className="file-loader">
          <FilePicker
            accept="image/*"
            label={label}
            onOverSizeLimit={OverSizeLimitStyle.FILTER}
            handler={this.onIconPick}
          />
          {this.getClearButton()}
        </div>
      </>
    );
  }
}
