﻿
import * as React from 'react'
import { Modal, ModalProps, ModalClass, ButtonToolbar } from 'react-bootstrap'
import * as Finder from '../Finder'
import { openModal, IModalProps } from '../Modals';
import { ColumnOption, QueryDescription, QueryToken, SubTokensOptions, FilterType } from '../FindOptions'
import { SearchMessage, JavascriptMessage, Lite, Entity, DynamicQuery } from '../Signum.Entities'
import { ValueLine, EntityLine, EntityCombo } from '../Lines'
import { Binding, IsByAll, getTypeInfos } from '../Reflection'
import { TypeContext, FormGroupStyle } from '../TypeContext'
import QueryTokenBuilder from './QueryTokenBuilder'


interface ColumnEditorProps extends React.Props<ColumnEditor> {
    columnOption: ColumnOption
    subTokensOptions: SubTokensOptions;
    queryDescription: QueryDescription;
    onChange: (token?: QueryToken) => void;
    close: () => void;
}

export default class ColumnEditor extends React.Component<ColumnEditorProps, {}>  {

    handleTokenChanged = (newToken: QueryToken) => {
        this.props.columnOption.token = newToken;
        this.props.columnOption.displayName = newToken.niceName;
        this.props.onChange(newToken);

    }

    handleOnChange = (event: React.FormEvent) => {
        this.props.columnOption.displayName = (event.currentTarget as HTMLInputElement).value;
        this.props.onChange(null);
    }

    render() {
        var co = this.props.columnOption;

        return <div className="sf-column-editor form-xs">
            <button type="button" className="close" aria-label="Close" onClick={this.props.close} ><span aria-hidden="true">×</span></button>
             <QueryTokenBuilder
                 queryToken={co.token}
                 onTokenChange={this.handleTokenChanged}
                 queryKey={this.props.queryDescription.queryKey}
                 subTokenOptions={this.props.subTokensOptions}
                 readOnly={false}/>
          <input className="form-control"
              value={co.displayName}
              onChange={this.handleOnChange} />
            </div>;
    }

}


