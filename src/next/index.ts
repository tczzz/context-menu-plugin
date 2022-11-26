import { BaseSchemes, CanAssignSignal, Scope } from 'rete'
import { Area2DInherited, AreaPlugin, RenderData } from 'rete-area-plugin'

import { Item, ItemsCollection } from './types'

export * as Presets from './presets'

console.log('context menu')

type Props<Schemes extends BaseSchemes, K> = {
  area: AreaPlugin<Schemes, Substitute<K, Schemes>>
  delay?: number
  items(context: 'root' | Schemes['Node']): ItemsCollection
}

export type ContextMenuData = {
  type: 'contextmenu'
  element: HTMLElement
  items: Item[]
  onHide(): void
  searchBar?: boolean
}
export type ContextMenuExtra<Schemes extends BaseSchemes> =
  | { type: 'unmount', data: { element: HTMLElement } }
  | { type: 'render', data: RenderData<Schemes> | ContextMenuData }

type IsCompatible<K> = Extract<K, { type: 'render' }> extends { type: 'render', data: infer P } ? CanAssignSignal<P, ContextMenuData> : false // TODO should add type: 'render' ??
type Substitute<K, Schemes extends BaseSchemes> = IsCompatible<K> extends true ? K : ContextMenuExtra<Schemes>

export class ContextMenuPlugin<
  Schemes extends BaseSchemes,
  K
> extends Scope<never, Area2DInherited<Schemes, Substitute<K, Schemes>>> {
    constructor(props: Props<Schemes, K>) {
        super('context-menu')

        const element = document.createElement('div')

        element.style.display = 'none'
        element.style.position = 'fixed'

        // eslint-disable-next-line max-statements
        this.addPipe(context => {
            const parent = this.parentScope() as Scope<ContextMenuExtra<Schemes>>

            if (!parent) throw new Error('parent')

            if (!('type' in context)) return context
            if (context.type === 'unmount') {
                if (context.data.element === element) {
                    element.style.display = 'none'
                }
            } else if (context.type === 'contextmenu') {
                context.data.event.preventDefault()
                context.data.event.stopPropagation()

                const { searchBar, list } = props.items(context.data.context)

                props.area.container.appendChild(element)
                element.style.left = `${context.data.event.clientX}px`
                element.style.top = `${context.data.event.clientY}px`
                element.style.display = ''

                parent.emit({
                    type: 'render',
                    data: {
                        type: 'contextmenu',
                        element,
                        searchBar,
                        onHide() {
                            parent.emit({ type: 'unmount', data: { element } })
                        },
                        items: list
                    }
                })
            } else if (context.type === 'pointerdown') {
                if (!context.data.event.composedPath().includes(element)) {
                    parent.emit({ type: 'unmount', data: { element } })
                }
            }
            return context
        })
    }
}