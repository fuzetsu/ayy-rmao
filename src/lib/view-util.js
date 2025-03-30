import { m, z } from '@/vdom'
import LOADING_IMG from '@/img/loading.gif'

export const loadingImg = () => m('img' + z`filter invert($loading-filter)`, { src: LOADING_IMG })

export const externalLink = 'a[target=_blank][rel=nofollow noreferrer noopener]'
