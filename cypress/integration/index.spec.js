const loadSub = sub =>
  cy.get('[placeholder=subreddit]').type(sub).trigger('keydown', { key: 'Enter' })

describe('Ayy Rmao', () => {
  beforeEach(() => cy.visit('/'))
  it('renders', () => {
    ;['Ayy Rmao', 'NSFW', 'Please enter a subreddit'].forEach(x => cy.contains(x))
  })

  it('can load subreddit', () => {
    loadSub('all')
    cy.get('.post-preview').should('exist')
  })

  it('can toggle nsfw', () => {
    cy.contains('NSFW').should('exist').find('.toggle-button').should('not.have.attr', 'checked')
    loadSub('all')
    cy.get('.post-preview').should('exist')
    cy.get('.toggle-button').click().should('have.attr', 'checked', 'checked')
    cy.get('.post-preview').should('not.exist')
    cy.get('.post-preview').should('exist')
  })

  it('infini-scroll works', () => {
    loadSub('all')
    cy.get('.post-preview').then($posts => {
      const firstLength = $posts.length
      cy.get('main').scrollTo('bottom')
      cy.get('.post-preview').should('have.length.gt', firstLength)
    })
  })
})
