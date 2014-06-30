﻿/// <reference path="globals.ts"/>

import Entities = require("Framework/Signum.Web/Signum/Scripts/Entities")
import Navigator = require("Framework/Signum.Web/Signum/Scripts/Navigator")

export var doubleScroll = true;

export interface FindOptions {
    allowChangeColumns?: boolean;
    allowOrder?: boolean;
    allowSelection?: boolean;
    columnMode?: ColumnOptionsMode;
    columns?: ColumnOption[];
    create?: boolean;
    elems?: number;
    showHeader?: boolean;
    showFilters?: boolean;
    showFilterButton?: boolean;
    showFooter?: boolean;
    showContextMenu?: boolean;
    selectedItemsContextMenu?: boolean;
    filters?: FilterOption[];
    navigate?: boolean;
    openFinderUrl?: boolean;
    orders?: OrderOption[];
    prefix: string;
    webQueryName: string;
    searchOnLoad?: boolean;
}

export interface FilterOption {
    columnName: string;
    operation: FilterOperation;
    value: string
}

export enum FilterOperation {
    EqualTo,
    DistinctTo,
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
    Contains,
    StartsWith,
    EndsWith,
    Like,
    NotContains,
    NotStartsWith,
    NotEndsWith,
    NotLike,
    IsIn,
}


export interface OrderOption {
    columnName: string;
    orderType: OrderType;
}

export enum OrderType {
    Ascending,
    Descending
}


export interface ColumnOption {
    columnName: string;
    displayName: string;
}

export enum ColumnOptionsMode {
    Add,
    Remove,
    Replace,
}

export function getFor(prefix: string): Promise<SearchControl> {
    return prefix.child("sfSearchControl").get().SFControl<SearchControl>();
}

export function findMany(findOptions: FindOptions): Promise<Array<Entities.EntityValue>> {
    findOptions.allowSelection = true;
    return findInternal(findOptions, true);
}

export function find(findOptions: FindOptions): Promise<Entities.EntityValue> {
    findOptions.allowSelection = true;
    return findInternal(findOptions, false).then(array=> array == null ? null : array[0]);
}

export enum RequestType {
    QueryRequest,
    FindOptions,
    FullScreen
}

function findInternal(findOptions: FindOptions, multipleSelection: boolean): Promise<Array<Entities.EntityValue>> {
    return SF.ajaxPost({
        url: findOptions.openFinderUrl || SF.Urls.partialFind,
        data: requestDataForOpenFinder(findOptions, false)
    }).then(modalDivHtml => {

            var modalDiv = $(modalDivHtml);

            var okButtonId = findOptions.prefix.child("btnOk");

            var items: Entities.EntityValue[];
            return Navigator.openModal(modalDiv, button => {

                if (button.id != okButtonId)
                    return Promise.resolve(true);

                return getFor(findOptions.prefix).then(sc=> {
                    items = sc.selectedItems();
                    if (items.length == 0 || items.length > 1 && !multipleSelection)
                        return false;

                    return true;
                });
            }, div=> {
                    getFor(findOptions.prefix).then(sc=> {
                        updateOkButton(okButtonId, sc.selectedItems().length, multipleSelection);
                        sc.selectionChanged = selected => updateOkButton(okButtonId, selected.length, multipleSelection);
                    });
                }).then(pair => pair.button.id == okButtonId ? items : null);
        });
}

function updateOkButton(okButtonId: string, sel: number, multipleSelection: boolean) {
    var okButon = $("#" + okButtonId);
    if (sel == 0 || sel > 1 && !multipleSelection) {
        okButon.attr("disabled", "disabled");
        okButon.parent().tooltip({
            title: sel == 0 ? lang.signum.noElementsSelected : lang.signum.selectOnlyOneElement,
            placement: "top"
        });
    }
    else {
        okButon.removeAttr("disabled");
        okButon.parent().tooltip("destroy");
    }
}

export function explore(findOptions: FindOptions): Promise<void> {
    return SF.ajaxPost({
        url: findOptions.openFinderUrl || SF.Urls.partialFind,
        data: requestDataForOpenFinder(findOptions, true)
    }).then(modalDivHtml => Navigator.openModal($(modalDivHtml)))
        .then(() => null);
}

export function requestDataForOpenFinder(findOptions: FindOptions, isExplore: boolean) {
    var requestData = {
        webQueryName: findOptions.webQueryName,
        elems: findOptions.elems,
        allowSelection: findOptions.allowSelection,
        prefix: findOptions.prefix
    };

    if (findOptions.navigate == false) {
        requestData["navigate"] = findOptions.navigate;
    }
    if (findOptions.searchOnLoad == true) {
        requestData["searchOnLoad"] = findOptions.searchOnLoad;
    }
    if (findOptions.showHeader == false) {
        requestData["showHeader"] = findOptions.showHeader;
    }
    if (findOptions.showFilters == false) {
        requestData["showFilters"] = findOptions.showFilters;
    }
    if (findOptions.showFilterButton == false) {
        requestData["showFilterButton"] = findOptions.showFilterButton;
    }
    if (findOptions.showFooter == false) {
        requestData["showFooter"] = findOptions.showFooter;
    }
    if (!findOptions.create) {
        requestData["create"] = findOptions.create;
    }
    if (!findOptions.allowChangeColumns) {
        requestData["allowChangeColumns"] = findOptions.allowChangeColumns;
    }
    if (findOptions.filters != null) {
        requestData["filters"] = findOptions.filters.map(f=> f.columnName + "," + FilterOperation[f.operation] + "," + SearchControl.encodeCSV(f.value)).join(";");//List of filter names "token1,operation1,value1;token2,operation2,value2"
    }
    if (findOptions.orders != null) {
        requestData["orders"] = serializeOrders(findOptions.orders);
    }
    if (findOptions.columns != null) {
        requestData["columns"] = findOptions.columns.map(c=> c.columnName + "," + c.displayName).join(";");//List of column names "token1,displayName1;token2,displayName2"
    }
    if (findOptions.columnMode != null) {
        requestData["columnMode"] = findOptions.columnMode;
    }

    requestData["isExplore"] = isExplore;

    return requestData;
}

export function serializeOrders(orders: OrderOption[]) {
    return orders.map(f=> (f.orderType == OrderType.Ascending ? "" : "-") + f.columnName).join(";");//A Json array like ["Id","-Name"] => Id asc, then Name desc
}

export function deleteFilter(trId) {
    var $tr = $("tr#" + trId);
    if ($tr.find("select[disabled]").length > 0) {
        return;
    }

    if ($tr.siblings().length == 0) {
        var $filterList = $tr.closest(".sf-filters-list");
        $filterList.find(".sf-explanation").show();
        $filterList.find("table").hide();
    }

    $tr.remove();
}



export class SearchControl {

    filterBuilder: FilterBuilder;
    element: JQuery;

    keys = {
        elems: "sfElems",
        page: "sfPage",
        pagination: "sfPaginationMode"
    };

    prefix: string;
    options: FindOptions;
    types: Entities.TypeInfo[];

    creating: () => void;
    selectionChanged: (selected: Entities.EntityValue[]) => void;

    constructor(element: JQuery, _options: FindOptions, types: Entities.TypeInfo[]) {

        element.data("SF-control", this);

        this.element = element;
        this.types = types;

        this.options = $.extend({
            allowChangeColumns: true,
            allowOrder: true,
            allowSelection: true,
            allowMultiple: true,
            columnMode: "Add",
            columns: null,
            create: true,
            elems: null,
            selectedItemsContextMenu: true,
            showHeader: true,
            showFilters: true,
            showFilterButton: true,
            showFooter: true,
            showContextMenu: true,
            filters: null,
            navigate: true,
            openFinderUrl: null,
            orders: [], //A Json array like ["Id","-Name"] => Id asc, then Name desc
            prefix: "",
            searchOnLoad: false,
            webQueryName: null
        }, _options);

        this.prefix = this.options.prefix;

        this._create();
    }

    public ready() {
        this.element.SFControlFullfill(this);
    }

    _create() {
        this.filterBuilder = new FilterBuilder(
            this.prefix.child("tblFilterBuilder").get(),
            this.options.prefix,
            this.options.webQueryName,
            SF.Urls.addFilter);

        this.filterBuilder.addColumnClicked = () => this.addColumn();

        var $tblResults = this.element.find(".sf-search-results-container");

        if (this.options.allowOrder) {
            $tblResults.on("click", "th:not(.sf-th-entity):not(.sf-th-selection)", e => {
                SearchControl.newSortOrder(this.options.orders, $(e.currentTarget), e.shiftKey);
                this.search();
                return false;
            });
        }

        if (this.options.allowChangeColumns || this.options.showContextMenu) {
            $tblResults.on("contextmenu", "th:not(.sf-th-entity):not(.sf-th-selection)", e => {
                this.headerContextMenu(e);
                return false;
            });
        }

        if (this.options.allowChangeColumns) {

            this.createMoveColumnDragDrop();
        }

        if (this.options.showContextMenu) {
            $tblResults.on("contextmenu", "td:not(.sf-td-no-results):not(.sf-td-multiply,.sf-search-footer-pagination)", e => {

                var $td = $(e.currentTarget).closest("td");

                var $tr = $td.closest("tr");
                var $currentRowSelector = $tr.find(".sf-td-selection");
                if ($currentRowSelector.filter(":checked").length == 0) {
                    this.changeRowSelection(this.prefix.child("sfSearchControl").get().find(".sf-td-selection:checked"), false);
                    this.changeRowSelection($currentRowSelector, true);
                }

                var index = $td.index();
                var $th = $td.closest("table").find("th").eq(index);
                if ($th.hasClass('sf-th-selection') || $th.hasClass('sf-th-entity')) {
                    if (this.options.selectedItemsContextMenu == true) {
                        this.entityContextMenu(e);
                    }
                }
                else {
                    this.cellContextMenu(e);
                }
                return false;
            });

        }

        if (this.options.showFooter) {
            this.element.on("click", ".sf-search-footer ul.pagination a", e=>
                this.search(parseInt($(e.currentTarget).attr("data-page")))
                );

            this.element.on("change", ".sf-search-footer .sf-pagination-size", e => {
                if ($(e.currentTarget).find("option:selected").val() == "All") {
                    this.clearResults();
                }
                else {
                    this.search();
                }
            });
        }

        if (this.options.showContextMenu) {
            $tblResults.on("change", ".sf-td-selection", e=> {
                this.changeRowSelection($(e.currentTarget), $(e.currentTarget).filter(":checked").length > 0);
            });

            this.prefix.child("sfFullScreen").get().on("mousedown", e => {
                e.preventDefault();
                this.fullScreen(e);
            });

            this.prefix.child("btnSelected").get().click(e=> {
                this.ctxMenuInDropdown();
            });
        }

        $tblResults.on("selectstart", "th:not(.sf-th-entity):not(.sf-th-selection)", e => {
            return false;
        });

        if (doubleScroll) {
            var div = this.prefix.child("divResults").get();

            div.removeClass("table-responsive");
            div.css("overflow-x", "auto");

            var divUp = this.options.prefix.child("divResults_Up").tryGet();

            if (!divUp.length) {
                divUp = $("<div>")
                    .attr("id", this.options.prefix.child("divResults_Up"))
                    .css("overflow-x", "auto")
                    .css("overflow-y", "hidden")
                    .css("height", "15")
                    .insertBefore(div);

                var resultUp = $("<div>").attr("id", this.options.prefix.child("tblResults_Up")).css("height", "1").appendTo(divUp);
            }

            div.scroll(() => { this.syncSize(); divUp.scrollLeft(div.scrollLeft()); });
            divUp.scroll(() => { this.syncSize(); div.scrollLeft(divUp.scrollLeft()); });

            this.syncSize();

            window.onresize = () => this.syncSize();
        }

        if (this.options.searchOnLoad) {
            this.searchOnLoad();
        }
    }

    syncSize() {
        if (!doubleScroll)
            return;

        this.prefix.child("tblResults_Up").get().width(this.prefix.child("tblResults").get().width());

        this.prefix.child("divResults_Up").get().css("height",
            this.prefix.child("tblResults_Up").get().width() > this.prefix.child("divResults_Up").get().width() ? "15" : "1");
    }

    changeRowSelection($rowSelectors, select: boolean) {
        $rowSelectors.prop("checked", select);
        $rowSelectors.closest("tr").toggleClass("active", select);

        var selected = this.element.find(".sf-td-selection:checked").length;

        this.prefix.child("btnSelectedSpan").get().text(selected);
        var btn = this.prefix.child("btnSelected").get();
        if (selected == 0)
            btn.attr("disabled", "disabled");
        else
            btn.removeAttr("disabled");

        if (this.selectionChanged)
            this.selectionChanged(this.selectedItems());
    }

    ctxMenuInDropdown() {

        var $dropdown = this.prefix.child("btnSelectedDropDown").get();

        if (!$dropdown.closest(".btn-group").hasClass("open")) {

            $dropdown.html(this.loadingMessage());

            SF.ajaxPost({
                url: SF.Urls.selectedItemsContextMenu,
                data: this.requestDataForContextMenu(),
            }).then(items => $dropdown.html(items || this.noActionsFoundMessage()));
        }
    }



    headerContextMenu(e: JQueryEventObject) {
        var $th = $(e.target).closest("th");
        var menu = SF.ContextMenu.createContextMenu(e);

        if (this.options.showHeader && (this.options.showFilterButton || this.options.showFilters)) {
            menu.append($("<li>").append($("<a>").text(lang.signum.addFilter).addClass("sf-quickfilter-header").click(() => this.quickFilterHeader($th))));
        }


        if (this.options.allowChangeColumns) {
            menu
                .append($("<li>").append($("<a>").text(lang.signum.renameColumn).addClass("sf-edit-header").click(() => this.editColumn($th))))
                .append($("<li>").append($("<a>").text(lang.signum.removeColumn).addClass("sf-remove-header").click(() => this.removeColumn($th))));
        }
    }

    cellContextMenu(e: JQueryEventObject) {
        var $td = $(e.target).closest("td");
        var $menu = SF.ContextMenu.createContextMenu(e);

        if (this.options.showHeader && (this.options.showFilterButton || this.options.showFilters)) {
            $menu.append($("<li>").append($("<a>").text(lang.signum.addFilter).addClass("sf-quickfilter").click(() => this.quickFilterCell($td))));
            $menu.append($("<li class='divider'></li>"));
        }

        var message = this.loadingMessage();

        $menu.append(message);

        SF.ajaxPost({
            url: SF.Urls.selectedItemsContextMenu,
            data: this.requestDataForContextMenu()
        }).then((items) => message.replaceWith(items || this.noActionsFoundMessage()));
    }

    requestDataForContextMenu() {
        return {
            liteKeys: this.element.find(".sf-td-selection:checked").closest("tr").map(function () { return $(this).data("entity"); }).toArray().join(","),
            webQueryName: this.options.webQueryName,
            prefix: this.options.prefix,
            implementationsKey: this.types.map(a=> a.name).join(","),
        };
    }

    entityContextMenu(e: JQueryEventObject) {
        var $td = $(e.target).closest("td");

        var $menu = SF.ContextMenu.createContextMenu(e);

        $menu.html(this.loadingMessage());

        SF.ajaxPost({
            url: SF.Urls.selectedItemsContextMenu,
            data: this.requestDataForContextMenu()
        })
            .then((items) => {
                $menu.html(items || this.noActionsFoundMessage());
            });

        return false;
    }

    private loadingMessage() {
        return $("<li></li>").addClass("sf-tm-selected-loading").html($("<span></span>").html(lang.signum.loading));
    }

    private noActionsFoundMessage() {
        return $("<li></li>").addClass("sf-search-ctxitem-no-results").html($("<span></span>").html(lang.signum.noActionsFound));
    }

    fullScreen(evt) {
        var urlParams = this.requestDataForSearchInUrl();

        var url = this.element.attr("data-find-url") + "?" + urlParams;
        if (evt.ctrlKey || evt.which == 2) {
            window.open(url);
        }
        else if (evt.which == 1) {
            window.location.href = url;
        }
    }

    search(page?: number) {
        var $searchButton = this.prefix.child("qbSearch").get();
        $searchButton.addClass("sf-searching");
        var count = parseInt($searchButton.attr("data-searchCount")) || 0;
        var self = this;
        SF.ajaxPost({
            url: SF.Urls.search,
            data: this.requestDataForSearch(RequestType.QueryRequest, page)
        }).then(r => {
                var $tbody = self.element.find(".sf-search-results-container tbody");
                if (!SF.isEmpty(r)) {
                    var rows = $(r);

                    var divs = rows.filter("tr.extract").children().children();

                    this.element.find("div.sf-search-footer").replaceWith(divs.filter("div.sf-search-footer"));

                    var mult = divs.filter("div.sf-td-multiply");
                    var multCurrent = this.element.find("div.sf-td-multiply");

                    if (multCurrent.length)
                        multCurrent.replaceWith(mult);
                    else
                        this.element.find("div.sf-query-button-bar").after(mult);

                    $tbody.html(rows.not("tr.extract"));
                }
                else {
                    $tbody.html("");
                }
                $searchButton.removeClass("sf-searching");
                $searchButton.attr("data-searchCount", count + 1);
                this.syncSize();
            });
    }

    requestDataForSearchInUrl(): string {
        var page = this.prefix.child(this.keys.page).tryGet().val() || 1
        var form = this.requestDataForSearch(RequestType.FullScreen, page);

        return $.param(form);
    }



    requestDataForSearch(type: RequestType, page?: number): FormObject {
        var requestData: FormObject = {};
        if (type != RequestType.FullScreen)
            requestData["webQueryName"] = this.options.webQueryName;

        requestData["pagination"] = this.prefix.child(this.keys.pagination).tryGet().val();
        requestData["elems"] = this.prefix.child(this.keys.elems).tryGet().val();
        requestData["page"] = page || 1;
        requestData["allowSelection"] = this.options.allowSelection;
        requestData["navigate"] = this.options.navigate;
        requestData["filters"] = this.filterBuilder.serializeFilters();

        if (type != RequestType.FullScreen)
            requestData["showFooter"] = this.options.showFooter;

        requestData["orders"] = this.serializeOrders();
        requestData["columns"] = this.serializeColumns();
        requestData["columnMode"] = 'Replace';

        requestData["prefix"] = this.options.prefix;
        return requestData;
    }




    static encodeCSV(value: string) {
        if (!value)
            return "";

        var hasQuote = value.indexOf("\"") != -1;
        if (hasQuote || value.indexOf(",") != -1 || value.indexOf(";") != -1) {
            if (hasQuote)
                value = value.replace(/"/g, "\"\"");
            return "\"" + value + "\"";
        }

        return value;
    }

    serializeOrders() {
        return serializeOrders(this.options.orders);
    }

    serializeColumns() {
        var self = this;
        return this.prefix.child("tblResults").get().find("thead tr th:not(.sf-th-entity):not(.sf-th-selection)").toArray().map(th=> {
            var $th = $(th);
            var token = $th.data("column-name");
            var niceName = $th.data("nice-name");
            var displayName = $th.text().trim();
            if (niceName == displayName)
                return token;
            else
                return token + "," + displayName;
        }).join(";");
    }

    static getSelectedItems(prefix: string): Array<Entities.EntityValue> {
        return $("input:checkbox[name^=" + prefix.child("rowSelection") + "]:checked").toArray().map(v=> {
            var parts = (<HTMLInputElement>v).value.split("__");
            return new Entities.EntityValue(new Entities.RuntimeInfo(parts[1], parseInt(parts[0]), false),
                parts[2],
                $(v).parent().next().children('a').attr('href'));
        });
    }

    static liteKeys(values: Array<Entities.EntityValue>): string {
        return values.map(v=> v.runtimeInfo.key()).join(",");
    }

    selectedItems(): Array<Entities.EntityValue> {
        return SearchControl.getSelectedItems(this.options.prefix);
    }

    selectedItemsLiteKeys(): string {
        return SearchControl.liteKeys(this.selectedItems());
    }

    static newSortOrder(orders : OrderOption[], $th: JQuery, multiCol: boolean) {

        SF.ContextMenu.hideContextMenu();

        var columnName = $th.data("column-name");

        var cols = orders.filter(o=> o.columnName == columnName);
        var col = cols.length == 0 ? null : cols[0];

        var oposite = col == null ? OrderType.Ascending :
            col.orderType == OrderType.Ascending ? OrderType.Descending : OrderType.Ascending;
        var $sort = $th.find("span.sf-header-sort")
        if (!multiCol) {
            $th.closest("thead").find("span.sf-header-sort").removeClass("asc desc l0 l1 l2 l3");
            $sort.addClass(oposite == OrderType.Ascending ? "asc" : "desc");

            while (orders.length > 0) //clear
                orders.pop();

            orders.push({ columnName: columnName, orderType: oposite });
        }
        else {
            if (col !== null) {
                col.orderType = oposite;
                $sort.removeClass("asc desc").addClass(oposite == OrderType.Ascending ? "asc" : "desc");
            }
            else {
                orders.push({ columnName: columnName, orderType: oposite });
                $sort.addClass(oposite == OrderType.Ascending ? "asc" : "desc").addClass("l" + (orders.length - 1 % 4));
            }
        }
    }

    addColumn() {
        if (!this.options.allowChangeColumns || this.prefix.child("tblFilters").get().find("tbody").length == 0) {
            throw "Adding columns is not allowed";
        }

        var tokenName = QueryTokenBuilder.constructTokenName(this.options.prefix.child("tokenBuilder"));
        if (SF.isEmpty(tokenName)) {
            return;
        }

        var tblResults = this.prefix.child("tblResults").get();

        var prefixedTokenName = this.options.prefix.child(tokenName);
        if (tblResults.find("thead tr th[id=\"" + prefixedTokenName + "\"]").length > 0) {
            return;
        }

        var $tblHeaders = tblResults.find("thead tr");

        SF.ajaxPost({
            url: SF.Urls.addColumn,
            data: { "webQueryName": this.options.webQueryName, "tokenName": tokenName },
            async: false,
        }).then(html => { $tblHeaders.append(html); this.syncSize(); });
    }

    editColumn($th: JQuery) {
        var colName = $th.find("span").text().trim();

        Navigator.valueLineBox({
            prefix: this.options.prefix.child("newName"),
            title: lang.signum.renameColumn,
            message: lang.signum.enterTheNewColumnName,
            value: colName,
            type: Navigator.ValueLineType.TextBox,
        }).then(result => {
                if (result)
                    $th.find("span:not(.sf-header-sort)").text(result);
                this.syncSize();
            });
    }

    moveColumn($source: JQuery, $target: JQuery, before: boolean) {
        if (before) {
            $target.before($source);
        }
        else {
            $target.after($source);
        }

        $source.removeAttr("style"); //remove absolute positioning
        this.clearResults();
    }

    createMoveColumnDragDrop() {

        var rowsSelector = ".sf-search-results th:not(.sf-th-entity):not(.sf-th-selection)";
        var current: HTMLTableHeaderCellElement = null;
        this.element.on("dragstart", rowsSelector, (e: JQueryEventObject) => {
            var de = <DragEvent><Event>e.originalEvent;
            de.dataTransfer.effectAllowed = "move";
            de.dataTransfer.setData("Text", $(e.currentTarget).attr("data-column-name"));
            current = <HTMLTableHeaderCellElement>e.currentTarget;
        });


        function dragClass(offsetX: number, width: number) {
            if (!offsetX)
                return null;

            if (width < 100 ? (offsetX < (width / 2)) : (offsetX < 50))
                return "drag-left";

            if (width < 100 ? (offsetX > (width / 2)) : (offsetX > (width - 50)))
                return "drag-right";

            return null;
        }

        var onDragOver = (e: JQueryEventObject) => {
            if (e.preventDefault) e.preventDefault();

            var de = <DragEvent><Event>e.originalEvent;
            if (e.currentTarget == current) {
                de.dataTransfer.dropEffect = "none";
                return;
            }

            $(e.currentTarget).removeClass("drag-left drag-right");
            $(e.currentTarget).addClass(dragClass(de.pageX - $(e.currentTarget).offset().left, $(e.currentTarget).width()));

            de.dataTransfer.dropEffect = "move";
        }
        this.element.on("dragover", rowsSelector, onDragOver);
        this.element.on("dragenter", rowsSelector, onDragOver);


        this.element.on("dragleave", rowsSelector, e => {
            $(e.currentTarget).removeClass("drag-left drag-right");
        });

        var me = this;
        this.element.on("drop", rowsSelector, e => {

            if (e.preventDefault) e.preventDefault();

            var curr = $(e.currentTarget);

            curr.removeClass("drag-left drag-right");

            var de = <DragEvent><Event>e.originalEvent;

            var result = dragClass(de.pageX - $(e.currentTarget).offset().left, curr.width());

            if (result)
                me.moveColumn($(current), curr, result == "drag-left");
        });
    }

    removeColumn($th) {
        $th.remove();
        this.clearResults();
        this.syncSize();
    }

    clearResults() {
        var $tbody = this.prefix.child("tblResults").get().find("tbody");
        $tbody.find("tr:not('.sf-search-footer')").remove();
        $tbody.prepend($("<tr></tr>").append($("<td></td>").attr("colspan", $tbody.find(".sf-search-footer td").attr("colspan"))));
    }

    toggleFilters() {
        var $toggler = this.element.find(".sf-filters-header");
        this.element.find(".sf-filters").toggle();
        $toggler.toggleClass('active');
        return false;
    }

    quickFilterCell($elem) {
        var value = $elem.data("value");
        if (typeof value == "undefined")
            value = $elem.html().trim()


        var cellIndex = $elem[0].cellIndex;
        var tokenName = $($($elem.closest(".sf-search-results")).find("th")[cellIndex]).data("column-name");

        this.filterBuilder.addFilter(tokenName, value);
    }

    quickFilterHeader($th) {
        this.filterBuilder.addFilter($th.data("column-name"), "");
    }

    create_click() {
        this.onCreate();
    }

    onCreate() {
        if (this.creating != null)
            this.creating();
        else {

            this.typeChooseCreate().then(type => {
                if (!type)
                    return;

                type.preConstruct().then(args => {
                    if (!args)
                        return;

                    args = $.extend(args, this.requestDataForSearchPopupCreate());

                    var runtimeInfo = new Entities.RuntimeInfo(type.name, null, true);
                    if (SF.isEmpty(this.options.prefix)) {
                        Navigator.navigate(runtimeInfo, args, false);
                    }
                    else
                        return Navigator.navigatePopup(new Entities.EntityHtml(this.options.prefix.child("Temp"), runtimeInfo),
                            { requestExtraJsonData: args });
                });
            });
        }
    }

    typeChooseCreate(): Promise<Entities.TypeInfo> {
        return Navigator.typeChooser(this.options.prefix, this.types.filter(t=> t.creable));
    }

    requestDataForSearchPopupCreate() {
        return {
            filters: this.filterBuilder.serializeFilters(),
            webQueryName: this.options.webQueryName
        };
    }

    toggleSelectAll() {
        this.changeRowSelection(
            this.prefix.child("sfSearchControl").get().find(".sf-td-selection"),
            this.prefix.child("cbSelectAll").get().is(":checked"));
    }

    searchOnLoadFinished = false;

    searchOnLoad() {
        var $button = this.options.prefix.child("qbSearch").get();

        SF.onVisible($button, () => {
            if (!this.searchOnLoadFinished) {
                $button.click();
                this.searchOnLoadFinished = true;
            }
        });
    }
}

export class FilterBuilder {

    addColumnClicked: () => void;

    constructor(
        public element: JQuery,
        public prefix: string,
        public webQueryName: string,
        public addFilterUrl: string) {

        this.newSubTokensComboAdded(this.element.find("#" + prefix.child("tokenBuilder") + " select:first"));

        this.element.on("sf-new-subtokens-combo", (event, ...args) => {
            this.newSubTokensComboAdded($("#" + args[0]));
        });
    }

    newSubTokensComboAdded($selectedCombo: JQuery) {
        var $btnAddFilter = this.prefix.child("btnAddFilter").tryGet();
        var $btnAddColumn = this.prefix.child("btnAddColumn").tryGet();

        var $selectedOption = $selectedCombo.children("option:selected");
        $selectedCombo.attr("title", $selectedOption.attr("title"));
        $selectedCombo.attr("style", $selectedOption.attr("style"));
        if ($selectedOption.val() == "") {
            var $prevSelect = $selectedCombo.prev("select");
            if ($prevSelect.length == 0) {
                this.changeButtonState($btnAddFilter, lang.signum.selectToken);
                this.changeButtonState($btnAddColumn, lang.signum.selectToken);
            }
            else {
                var $prevSelectedOption = $prevSelect.find("option:selected");
                this.changeButtonState($btnAddFilter, $prevSelectedOption.attr("data-filter"), () => this.addFilterClicked());
                this.changeButtonState($btnAddColumn, $prevSelectedOption.attr("data-column"), () => this.addColumnClicked());
            }
        } else {
            this.changeButtonState($btnAddFilter, $selectedOption.attr("data-filter"), () => this.addFilterClicked());
            this.changeButtonState($btnAddColumn, $selectedOption.attr("data-column"), () => this.addColumnClicked());
        }
    }

    changeButtonState($button: JQuery, disablingMessage: string, enableCallback?: (eventObject: JQueryEventObject) => any) {

        if (!$button)
            return;

        if (disablingMessage) {
            $button.attr("disabled", "disabled");
            $button.parent().tooltip({
                title: disablingMessage,
                placement: "bottom"
            });
            $button.unbind('click').bind('click', function (e) { e.preventDefault(); return false; });
        }
        else {
            var self = this;
            $button.removeAttr("disabled");
            $button.parent().tooltip("destroy");
            $button.unbind('click').bind('click', enableCallback);
        }
    }


    addFilterClicked() {
        var tokenName = QueryTokenBuilder.constructTokenName(this.prefix.child("tokenBuilder"));
        if (SF.isEmpty(tokenName)) {
            return;
        }

        this.addFilter(tokenName, null);
    }

    addFilter(tokenName: string, value: string) {
        var tableFilters = this.prefix.child("tblFilters").get().find("tbody");
        if (tableFilters.length == 0) {
            throw "Adding filters is not allowed";
        }

        var data = {
            webQueryName: this.webQueryName,
            tokenName: tokenName,
            value: value,
            index: this.newFilterRowIndex(),
            prefix: this.prefix
        };

        var self = this;
        SF.ajaxPost({
            url: this.addFilterUrl,
            data: data,
            async: false,
        }).then((filterHtml) => {
                var $filterList = self.element.find(".sf-filters-list");
                $filterList.find(".sf-explanation").hide();
                $filterList.find("table").show();

                tableFilters.append(filterHtml);
            });
    }

    newFilterRowIndex(): number {
        var lastRow = this.prefix.child("tblFilters").get().find("tbody tr:last");
        if (lastRow.length == 1) {
            return parseInt(lastRow[0].id.substr(lastRow[0].id.lastIndexOf("_") + 1, lastRow[0].id.length)) + 1;
        }
        return 0;
    }

    serializeFilters() {

        return this.prefix.child("tblFilters").get().find("tbody > tr").toArray().map(f=> {
            var $filter = $(f);

            var id = $filter[0].id;
            var index = id.afterLast("_");

            var selector = this.prefix.child("ddlSelector").child(index).get($filter).find("option:selected");

            var value = this.encodeValue($filter, index);

            return $filter.find("td:nth-child(2) > :hidden").val() + "," + selector.val() + "," + value;
        }).join(";");
    }

    encodeValue($filter: JQuery, index: string) {
        var filterValuePrefix = this.prefix.child("value").child(index);

        var eleme = filterValuePrefix.get();

        var date = filterValuePrefix.child("Date").tryGet($filter);
        var time = filterValuePrefix.child("Time").tryGet($filter);

        if (date.length && time.length) {
            var dateVal = date.val();
            var timeVal = time.val();
            return SearchControl.encodeCSV(dateVal && timeVal ? (dateVal + " " + timeVal) : null);
        }

        if (eleme.is("input:checkbox"))
            return (<HTMLInputElement> eleme[0]).checked;

        var infoElem = filterValuePrefix.child(Entities.Keys.runtimeInfo).tryGet(eleme);
        if (infoElem.length) { //If it's a Lite, the value is the Id
            var val = Entities.RuntimeInfo.parse(infoElem.val());
            return SearchControl.encodeCSV(val == null ? null : val.key());
        }

        return SearchControl.encodeCSV(eleme.val());
    }

}

export module QueryTokenBuilder {

    export function init(containerId: string, webQueryName: string, controllerUrl: string, options: number, requestExtraJsonData: any) {
        $("#" + containerId).on("change", "select", function () {
            tokenChanged($(this), webQueryName, controllerUrl, options, requestExtraJsonData);
        });
    }

    export function tokenChanged($selectedCombo: JQuery, webQueryName: string, controllerUrl: string, options: number, requestExtraJsonData: any) {

        var prefix = $selectedCombo.attr("id").before("ddlTokens_");
        if (prefix.endsWith("_"))
            prefix = prefix.substr(0, prefix.length - 1);

        var index = parseInt($selectedCombo.attr("id").after("ddlTokens_"));

        clearChildSubtokenCombos($selectedCombo, prefix, index);
        $selectedCombo.trigger("sf-new-subtokens-combo", $selectedCombo.attr("id"));

        var $selectedOption = $selectedCombo.children("option:selected");
        if ($selectedOption.val() == "") {
            return;
        }

        var tokenName = constructTokenName(prefix);

        var data = $.extend({
            webQueryName: webQueryName,
            tokenName: tokenName,
            index: index,
            prefix: prefix,
            options: options
        }, requestExtraJsonData);

        SF.ajaxPost({
            url: controllerUrl,
            data: data,
            dataType: "html",
        }).then(newHtml => {
                $selectedCombo.parent().html(newHtml);
            });
    };

    export function clearChildSubtokenCombos($selectedCombo: JQuery, prefix: string, index: number) {
        $selectedCombo.next("select,input[type=hidden]").remove();
    }

    export function constructTokenName(prefix: string) {
        var tokenName = "";
        var stop = false;
        for (var i = 0; ; i++) {
            var currSubtoken = prefix.child("ddlTokens_" + i).tryGet();
            if (currSubtoken.length == 0)
                break;

            var part = currSubtoken.val();
            tokenName = !tokenName ? part :
            !part ? tokenName :
            (tokenName + "." + part);
        }
        return tokenName;
    }
}

