/***
 * Computes the positions and dimensions of items that will be rendered by the list. The output from this is utilized by viewability tracker to compute the
 * lists of visible/hidden item.
 */
import { Dimension, LayoutProvider } from "../dependencies/LayoutProvider";
export declare abstract class LayoutManager {
    getOffsetForIndex(index: number): Point;
    getStyleOverridesForIndex(index: number): object | undefined;
    removeLayout(index: number): void;
    abstract getContentDimension(): Dimension;
    abstract getLayouts(): Layout[];
    abstract overrideLayout(index: number, dim: Dimension): boolean;
    abstract relayoutFromIndex(startIndex: number, itemCount: number): void;
}
export declare class WrapGridLayoutManager extends LayoutManager {
    private _layoutProvider;
    private _window;
    private _totalHeight;
    private _totalWidth;
    private _isHorizontal;
    private _layouts;
    constructor(layoutProvider: LayoutProvider, renderWindowSize: Dimension, isHorizontal?: boolean, cachedLayouts?: Layout[]);
    getContentDimension(): Dimension;
    /**
     * when remove layout is called, it will remove the layout from the layouts array
     * and if the layouts array is empty, it will reset the total height and total width to 0
     * @param index
     */
    removeLayout(index: number): void;
    getLayouts(): Layout[];
    getOffsetForIndex(index: number): Point;
    overrideLayout(index: number, dim: Dimension): boolean;
    setMaxBounds(itemDim: Dimension): void;
    relayoutFromIndex(startIndex: number, itemCount: number): void;
    private _pointDimensionsToRect;
    private _setFinalDimensions;
    private _locateFirstNeighbourIndex;
    private _checkBounds;
}
export interface Layout extends Dimension, Point {
    isOverridden?: boolean;
    type: string | number;
}
export interface Point {
    x: number;
    y: number;
}
