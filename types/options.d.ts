import { Vue, CreateElement, CombinedVueInstance } from "./vue";
import { VNode, VNodeData, VNodeDirective, NormalizedScopedSlot } from "./vnode";

type Constructor = {
  new(...args: any[]): any;
}

// we don't support infer props in async component
// N.B. ComponentOptions<V> is contravariant, the default generic should be bottom type
export type Component<Data = DefaultData<never>, Methods = DefaultMethods<never>, Computed = DefaultComputed, Injected = DefaultInjected, Props = DefaultProps> =
  | typeof Vue
  | FunctionalComponentOptions<Props>
  | ComponentOptions<never, Data, Methods, Computed, Injected, Props>

type EsModule<T> = T | { default: T }

type ImportedComponent<Data = DefaultData<never>, Methods = DefaultMethods<never>, Computed = DefaultComputed, Injected = DefaultInjected, Props = DefaultProps>
  = EsModule<Component<Data, Methods, Computed, Injected, Props>>

export type AsyncComponent<Data = DefaultData<never>, Methods = DefaultMethods<never>, Computed = DefaultComputed, Injected = DefaultInjected, Props = DefaultProps>
  = AsyncComponentPromise<Data, Methods, Computed, Injected, Props>
  | AsyncComponentFactory<Data, Methods, Computed, Injected, Props>

export type AsyncComponentPromise<Data = DefaultData<never>, Methods = DefaultMethods<never>, Computed = DefaultComputed, Injected = DefaultInjected, Props = DefaultProps> = (
  resolve: (component: Component<Data, Methods, Computed, Injected, Props>) => void,
  reject: (reason?: any) => void
) => Promise<ImportedComponent<Data, Methods, Computed, Injected, Props>> | void;

export type AsyncComponentFactory<Data = DefaultData<never>, Methods = DefaultMethods<never>, Computed = DefaultComputed, Injected = DefaultInjected, Props = DefaultProps> = () => {
  component: Promise<ImportedComponent<Data, Methods, Computed, Injected, Props>>;
  loading?: ImportedComponent;
  error?: ImportedComponent;
  delay?: number;
  timeout?: number;
}

/**
 * When the `Computed` type parameter on `ComponentOptions` is inferred,
 * it should have a property with the return type of every get-accessor.
 * Since there isn't a way to query for the return type of a function, we allow TypeScript
 * to infer from the shape of `Accessors<Computed>` and work backwards.
 */
export type Accessors<T> = {
  [K in keyof T]: (() => T[K]) | ComputedOptions<T[K]>
}

type DataDef<Data, Props, V> = Data | ((this: Readonly<Props> & V) => Data)
/**
 * This type should be used when an array of strings is used for a component's `props` value.
 */
export type ThisTypedComponentOptionsWithArrayProps<V extends Vue, Data, Methods, Computed, Injected, PropNames extends string> =
  object &
  ComponentOptions<V, DataDef<Data, Record<PropNames, any>, V>, Methods, Computed, Injected, PropNames[], Record<PropNames, any>> &
  ThisType<CombinedVueInstance<V, Data, Methods, Computed, Injected, Readonly<Record<PropNames, any>>>>;

/**
 * This type should be used when an object mapped to `PropOptions` is used for a component's `props` value.
 */
export type ThisTypedComponentOptionsWithRecordProps<V extends Vue, Data, Methods, Computed, Injected, Props> =
  object &
  ComponentOptions<V, DataDef<Data, Props, V>, Methods, Computed, Injected, RecordPropsDefinition<Props>> &
  ThisType<CombinedVueInstance<V, Data, Methods, Computed, Readonly<Injected>, Readonly<Props>>>;

type DefaultData<V> = object | ((this: V) => object);
type DefaultProps = Record<string, any>;
type DefaultInjected = Record<string, any>;
type DefaultMethods<V> = { [key: string]: (this: V, ...args: any[]) => any };
type DefaultComputed = { [key: string]: any };
export interface ComponentOptions<
  V extends Vue,
  Data = DefaultData<V>,
  Methods = DefaultMethods<V>,
  Computed = DefaultComputed,
  Injected = DefaultInjected,
  PropsDef = PropsDefinition<DefaultProps>,
  Props = DefaultProps> {
  data?: Data;
  props?: PropsDef;
  propsData?: object;
  computed?: Accessors<Computed>;
  methods?: Methods;
  watch?: Record<string, WatchOptionsWithHandler<any> | WatchHandler<any>>;

  el?: Element | string;
  template?: string;
  // hack is for functional component type inference, should not be used in user code
  render?(createElement: CreateElement, hack: RenderContext<Props>): VNode;
  renderError?(createElement: CreateElement, err: Error): VNode;
  staticRenderFns?: ((createElement: CreateElement) => VNode)[];

  beforeCreate?(this: V): void;
  created?(): void;
  beforeDestroy?(): void;
  destroyed?(): void;
  beforeMount?(): void;
  mounted?(): void;
  beforeUpdate?(): void;
  updated?(): void;
  activated?(): void;
  deactivated?(): void;
  errorCaptured?(err: Error, vm: Vue, info: string): boolean | void;
  serverPrefetch?(this: V): Promise<void>;

  directives?: { [key: string]: DirectiveFunction | DirectiveOptions };
  components?: { [key: string]: Component<any, any, any, any, any> | AsyncComponent<any, any, any, any, any> };
  transitions?: { [key: string]: object };
  filters?: { [key: string]: Function };

  provide?: object | (() => object);
  inject?: InjectDef<Injected>;

  model?: {
    prop?: string;
    event?: string;
  };

  parent?: Vue;
  mixins?: (ComponentOptions<Vue> | typeof Vue)[];
  name?: string;
  // TODO: support properly inferred 'extends'
  extends?: ComponentOptions<Vue> | typeof Vue;
  delimiters?: [string, string];
  comments?: boolean;
  inheritAttrs?: boolean;
}

export interface FunctionalComponentOptions<Props = DefaultProps, PropDefs = PropsDefinition<Props>> {
  name?: string;
  props?: PropDefs;
  model?: {
    prop?: string;
    event?: string;
  };
  inject?: InjectDef;
  functional: boolean;
  render?(this: undefined, createElement: CreateElement, context: RenderContext<Props>): VNode | VNode[];
}

export interface RenderContext<Props = DefaultProps> {
  props: Props;
  children: VNode[];
  slots(): any;
  data: VNodeData;
  parent: Vue;
  listeners: { [key: string]: Function | Function[] };
  scopedSlots: { [key: string]: NormalizedScopedSlot };
  injections: any
}

export type Prop<T> = { (): T } | { new(...args: never[]): T & object } | { new(...args: string[]): Function }

export type PropType<T> = Prop<T> | Prop<T>[];

export type PropValidator<T> = PropOptions<T> | PropType<T>;

export interface PropOptions<T = any> {
  type?: PropType<T>;
  required?: boolean;
  default?: T | null | undefined | (() => T | null | undefined);
  validator?(value: T): boolean;
}

export type RecordPropsDefinition<T> = {
  [K in keyof T]: PropValidator<T[K]>
}
export type ArrayPropsDefinition<T> = (keyof T)[];
export type PropsDefinition<T> = ArrayPropsDefinition<T> | RecordPropsDefinition<T>;

export interface ComputedOptions<T> {
  get?(): T;
  set?(value: T): void;
  cache?: boolean;
}

export type WatchHandler<T> = string | ((val: T, oldVal: T) => void);

export interface WatchOptions {
  deep?: boolean;
  immediate?: boolean;
}

export interface WatchOptionsWithHandler<T> extends WatchOptions {
  handler: WatchHandler<T>;
}

export interface DirectiveBinding extends Readonly<VNodeDirective> {
  readonly modifiers: { [key: string]: boolean };
}

export type DirectiveFunction = (
  el: HTMLElement,
  binding: DirectiveBinding,
  vnode: VNode,
  oldVnode: VNode
) => void;

export interface DirectiveOptions {
  bind?: DirectiveFunction;
  inserted?: DirectiveFunction;
  update?: DirectiveFunction;
  componentUpdated?: DirectiveFunction;
  unbind?: DirectiveFunction;
}

export type InjectKey = string | symbol;
type InjectOptions<I = object> = {
  from?: InjectKey,
  default?: I,
}

export type InjectDef<T = object> = {
  [K in keyof T]: InjectKey | InjectDef<T[K]>
} | (keyof T)[]
