import {AddUpdate} from '../update/add-update';

/**
 * @group addTo
 */
test('creates update expression for add update', () => {
  const update = new AddUpdate()
    .addTo('age', 2)
    .and()
    .addTo('book.titles', ['new book']);

  expect(update).toEqual({
    _names: {
      '#UE_age': 'age',
      '#UE_book': 'book',
      '#UE_book_titles': 'titles',
    },
    _values: {
      ':UE_age': 2,
      ':UE_book_titles': ['new book'],
    },
    expression: '#UE_age :UE_age, #UE_book.#UE_book_titles :UE_book_titles',
    prefix: 'ADD',
  });
});
