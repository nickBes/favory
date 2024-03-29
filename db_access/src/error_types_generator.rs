
#[macro_export]
macro_rules! generate_error_types {
    {$snake_case_name: expr} => {
        use paste::paste;
        paste!{
            use std::error::Error;

            #[derive(Debug)]
            pub struct [<$snake_case_name:camel Error>]{
                pub kind: [<$snake_case_name:camel ErrorKind>],
                pub inner: Option<Box<dyn Error>>,
            }

            pub type Result<T> = std::result::Result<T, [<$snake_case_name:camel Error>]>;

            pub trait [<Into $snake_case_name:camel Result>]<T>{
                fn [<into_ $snake_case_name _result>](self, error_kind: [<$snake_case_name:camel ErrorKind>])->Result<T>;
            }
            impl<T,E: Error + 'static> [<Into $snake_case_name:camel Result>]<T> for std::result::Result<T,E>{
                fn [<into_ $snake_case_name _result>](self, error_kind: [<$snake_case_name:camel ErrorKind>]) ->Result<T> {
                    self.map_err(|err| [<$snake_case_name:camel Error>]{
                        kind: error_kind,
                        inner: Some(Box::new(err))
                    })
                }
            }

            impl [<$snake_case_name:camel ErrorKind>]{
                pub fn [<into_empty_ $snake_case_name _error>](self)->[<$snake_case_name:camel Error>]{
                    [<$snake_case_name:camel Error>]{
                        kind: self,
                        inner: None,
                    }
                }
            }

            impl [<$snake_case_name:camel Error>]{
                pub fn empty(error_kind: [<$snake_case_name:camel ErrorKind>])->Self{
                    Self{
                        kind: error_kind,
                        inner: None
                    }
                }
            }
        }
    };
}
